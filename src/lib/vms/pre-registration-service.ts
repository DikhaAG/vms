import { randomUUID } from "node:crypto";
import {
  DEFAULT_SYSTEM_SETTINGS,
  validatePreRegistrationInput,
  type PreRegistrationErrorKind,
  type PreRegistrationMode,
  type PreRegistrationResult,
  type StubScenario,
  type Visit,
} from "./vms-contract";
import { formatFacilityIso, parseLocalDateTimeToUtc } from "./timezone";
import {
  deleteHikCentralAppointment,
  dispatchHikCentralAppointment,
  type DeleteAppointmentOptions,
  type DispatchAppointmentOptions,
  type HikCentralAppointmentParams,
  type HikCentralAppointmentSuccess,
  type HikCentralDeleteAppointmentSuccess,
} from "./hikcentral-appointment-adapter";
import { defaultVmsRepository, type IVmsRepository } from "./repository";
import { resolveVisitAccessLevels } from "./access-level-service";
import { HikCentralError } from "../hikcentral/client";
import { normalizeFaceImage, toPngDataUri } from "./face-normalizer";
import { parseMonitoringListFlag } from "./hikcentral-approval-adapter";

export interface PreRegistrationServiceDeps {
  repository?: IVmsRepository;
  appointmentDispatcher?: (
    params: HikCentralAppointmentParams,
    options?: DispatchAppointmentOptions,
  ) => Promise<HikCentralAppointmentSuccess>;
  appointmentDeleter?: (
    appointRecordId: string,
    options?: DeleteAppointmentOptions,
  ) => Promise<HikCentralDeleteAppointmentSuccess>;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  idGenerator?: () => string;
  now?: () => Date;
}

/**
 * Creates and registers a visitor pre-registration.
 * Normalizes start/end times to UTC and ISO 8601 offset strings derived from global systemSettings.timezone,
 * assigns flat building access levels, reserves the appointment in HikCentral OpenAPI,
 * and persists the Visit in PENDING_APPROVAL (or SECURITY_ESCALATED) state.
 */
export async function createPreRegistration(
  rawInput: unknown,
  deps: PreRegistrationServiceDeps = {},
): Promise<PreRegistrationResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const dispatchAppointment =
    deps.appointmentDispatcher ?? dispatchHikCentralAppointment;
  const generateId = deps.idGenerator ?? randomUUID;
  const getNow = deps.now ?? (() => new Date());

  // 1. Validate input payload
  const validation = validatePreRegistrationInput(rawInput);
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Input validation failed.",
        fieldErrors: validation.errors,
        status: 400,
      },
    };
  }

  const input = validation.input;
  // Server-injected deps win over the validated body; default to live dispatch.
  const effectiveMode: PreRegistrationMode = deps.mode ?? input.mode ?? "live";
  const effectiveStubScenario: StubScenario | undefined =
    deps.stubScenario ?? input.stubScenario;

  // 2. Fetch global system settings to obtain canonical IANA timezone
  const settings = await repository.getSettings();
  const timezone = settings?.timezone || DEFAULT_SYSTEM_SETTINGS.timezone;

  // Optional: If facilityId provided, resolve facility for non-breaking backward compatibility
  const facility = input.facilityId
    ? await repository.getFacility(input.facilityId)
    : undefined;

  // 3. Timezone conversion and normalization against global system timezone
  let startUtc: Date;
  let endUtc: Date;
  try {
    startUtc = parseLocalDateTimeToUtc(input.scheduledStartTime, timezone);
    endUtc = parseLocalDateTimeToUtc(input.scheduledEndTime, timezone);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message:
          err instanceof Error
            ? err.message
            : "Invalid scheduled time format for system timezone.",
        status: 400,
      },
    };
  }

  if (endUtc.getTime() <= startUtc.getTime()) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Scheduled end time must be after scheduled start time.",
        fieldErrors: {
          scheduledEndTime: "Scheduled end time must be after start time.",
        },
        status: 400,
      },
    };
  }

  const scheduledStartTimeFacility = formatFacilityIso(startUtc, timezone);
  const scheduledEndTimeFacility = formatFacilityIso(endUtc, timezone);

  // 4. Normalize biometric face photo if supplied (JPEG 10 KB - 100 KB)
  let wireFacePhotoBase64: string | undefined;
  let storedFacePhotoDataUri: string | undefined;
  if (input.facePhoto) {
    try {
      const normalizedPhoto = await normalizeFaceImage(input.facePhoto);
      wireFacePhotoBase64 = normalizedPhoto.base64;
      storedFacePhotoDataUri = normalizedPhoto.dataUri;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Invalid biometric face photo.";
      return {
        ok: false,
        error: {
          kind: "validation",
          message: `Face photo validation failed: ${msg}`,
          fieldErrors: {
            facePhoto: msg,
          },
          status: 400,
        },
      };
    }
  }

  // 5. Resolve flat building access levels (fallback to default access levels if none selected)
  const {
    accessLevelIds: effectiveAccessLevelIds,
    accessLevels: resolvedAccessLevels,
  } = await resolveVisitAccessLevels(repository, input.accessLevelIds);

  const qrCodeValidNum =
    input.tapQuota?.mode === "limited" ? (input.tapQuota.maxTaps ?? 1) : 0;

  // 6. Dispatch to HikCentral OpenAPI (POST /artemis/api/visitor/v2/appointment)
  let hikResult: HikCentralAppointmentSuccess;
  try {
    hikResult = await dispatchAppointment(
      {
        hostId: input.hostId,
        appointStartTime: scheduledStartTimeFacility,
        appointEndTime: scheduledEndTimeFacility,
        visitReasonType: input.visitReasonType,
        visitReasonDetail: input.visitReasonDetail,
        visitorFamilyName: input.visitorFamilyName,
        visitorGivenName: input.visitorGivenName,
        visitorPhone: input.visitorPhone,
        visitorEmail: input.visitorEmail,
        certificateType: input.certificateType,
        certificateNo: input.certificateNo,
        facePhotoData: wireFacePhotoBase64,
        accessLevels: resolvedAccessLevels,
        qrCodeValidNum,
      },
      {
        mode: effectiveMode,
        stubScenario: effectiveStubScenario,
      },
    );
  } catch (error) {
    const isHikError = error instanceof HikCentralError;
    const errorKind: PreRegistrationErrorKind = isHikError
      ? error.kind === "config"
        ? "config"
        : error.kind === "network"
          ? "network"
          : "upstream"
      : "upstream";

    return {
      ok: false,
      error: {
        kind: errorKind,
        message:
          error instanceof Error
            ? error.message
            : "HikCentral appointment failed.",
        status: isHikError
          ? (error.status ?? (errorKind === "config" ? 500 : 502))
          : 502,
        code: isHikError ? error.code : undefined,
      },
    };
  }

  // 7. Build and persist Visit record
  const currentTimeIso = getNow().toISOString();
  const monitoringFlag = parseMonitoringListFlag(hikResult);
  const visitStatus = monitoringFlag ? "SECURITY_ESCALATED" : "PENDING_APPROVAL";
  const formattedQrDataUri = hikResult.qrCodeImage
    ? toPngDataUri(hikResult.qrCodeImage)
    : undefined;

  const visit: Visit = {
    id: generateId(),
    facilityId: facility?.id ?? input.facilityId,
    facilityName: facility?.name,
    hostId: input.hostId,
    hostName: input.hostName,
    visitorFamilyName: input.visitorFamilyName,
    visitorGivenName: input.visitorGivenName,
    visitorPhone: input.visitorPhone,
    visitorEmail: input.visitorEmail,
    certificateType: input.certificateType,
    certificateNo: input.certificateNo,
    visitReasonType: input.visitReasonType,
    visitReasonDetail: input.visitReasonDetail,
    scheduledStartTimeUtc: startUtc.toISOString(),
    scheduledEndTimeUtc: endUtc.toISOString(),
    scheduledStartTimeFacility,
    scheduledEndTimeFacility,
    status: visitStatus,
    monitoringListFlag: monitoringFlag,
    facePhoto: storedFacePhotoDataUri,
    accessLevelIds: effectiveAccessLevelIds,
    tapQuota: input.tapQuota,
    credentialSyncStatus: "Applied",
    hikCentral: {
      appointRecordId: hikResult.appointRecordId,
      visitorId: hikResult.visitorId,
      appointCode: hikResult.appointCode,
      qrCodeImage: formattedQrDataUri,
    },
    createdAtUtc: currentTimeIso,
    updatedAtUtc: currentTimeIso,
  };

  await repository.saveVisit(visit);

  return {
    ok: true,
    visit,
  };
}

export interface CancelVisitResult {
  ok: boolean;
  visit?: Visit;
  error?: {
    kind: "validation" | "not_found" | "invalid_state" | "upstream";
    message: string;
    status?: number;
  };
}

/**
 * Cancels a pre-registration visit:
 * 1. Validates visit existence and ensures status is cancellable.
 * 2. Invokes HikCentral POST /artemis/api/visitor/v1/appointment/single/delete if appointRecordId exists.
 * 3. Transitions visit status to CANCELLED in the repository.
 */
export async function cancelVisit(
  visitId: string,
  reason?: string,
  deps: PreRegistrationServiceDeps = {},
): Promise<CancelVisitResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const deleteAppointment =
    deps.appointmentDeleter ?? deleteHikCentralAppointment;
  const getNow = deps.now ?? (() => new Date());

  const cleanVisitId = visitId?.trim();
  if (!cleanVisitId) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "visitId is required.",
        status: 400,
      },
    };
  }

  const visit = await repository.getVisit(cleanVisitId);
  if (!visit) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message: `Visit '${cleanVisitId}' not found.`,
        status: 404,
      },
    };
  }

  if (visit.status === "CANCELLED") {
    return {
      ok: false,
      error: {
        kind: "invalid_state",
        message: `Visit '${cleanVisitId}' is already cancelled.`,
        status: 400,
      },
    };
  }

  const cancellableStatuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "SECURITY_ESCALATED",
    "APPROVED",
  ];

  if (!cancellableStatuses.includes(visit.status)) {
    return {
      ok: false,
      error: {
        kind: "invalid_state",
        message: `Cannot cancel visit in status '${visit.status}'. Check-out must be used for checked-in visits.`,
        status: 400,
      },
    };
  }

  // Upstream HikCentral appointment deletion if reserved
  if (visit.hikCentral?.appointRecordId) {
    try {
      await deleteAppointment(visit.hikCentral.appointRecordId, {
        mode: deps.mode ?? "live",
        stubScenario: deps.stubScenario ?? "success",
      });
    } catch (err) {
      if (err instanceof HikCentralError) {
        return {
          ok: false,
          error: {
            kind: "upstream",
            message: `HikCentral appointment cancellation error: ${err.message}`,
            status: 502,
          },
        };
      }
      return {
        ok: false,
        error: {
          kind: "upstream",
          message:
            err instanceof Error
              ? err.message
              : "Failed to delete appointment in HikCentral.",
          status: 502,
        },
      };
    }
  }

  const cancelReason = reason?.trim() || undefined;
  const remarkWithCancel = cancelReason
    ? visit.remark
      ? `${visit.remark} | Cancel reason: ${cancelReason}`
      : `Cancel reason: ${cancelReason}`
    : visit.remark;

  const updatedVisit = await repository.updateVisit(visit.id, {
    status: "CANCELLED",
    cancelReason,
    remark: remarkWithCancel,
    updatedAtUtc: getNow().toISOString(),
  });

  return {
    ok: true,
    visit: updatedVisit,
  };
}