import { randomUUID } from "node:crypto";
import {
  validatePreRegistrationInput,
  type CreatePreRegistrationInput,
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
import { HikCentralError } from "../hikcentral/client";
import { toJpegDataUri } from "./face-normalizer";
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
 * Normalizes start/end times to UTC and facility-specific ISO 8601 offset strings,
 * reserves the appointment in HikCentral OpenAPI, and persists the Visit in PENDING_APPROVAL state.
 */
export async function createPreRegistration(
  rawInput: CreatePreRegistrationInput,
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
      },
    };
  }

  const input = validation.input;

  // 2. Fetch facility to obtain canonical IANA timezone
  const facility = await repository.getFacility(input.facilityId);
  if (!facility) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message: `Facility '${input.facilityId}' not found.`,
      },
    };
  }

  // 3. Timezone conversion and normalization
  let startUtc: Date;
  let endUtc: Date;
  try {
    startUtc = parseLocalDateTimeToUtc(
      input.scheduledStartTime,
      facility.timezone,
    );
    endUtc = parseLocalDateTimeToUtc(
      input.scheduledEndTime,
      facility.timezone,
    );
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message:
          err instanceof Error
            ? err.message
            : "Invalid scheduled time format for facility timezone.",
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
      },
    };
  }

  const scheduledStartTimeFacility = formatFacilityIso(
    startUtc,
    facility.timezone,
  );
  const scheduledEndTimeFacility = formatFacilityIso(
    endUtc,
    facility.timezone,
  );

  // 4. Resolve access levels & tap quota for physical synchronization
  let resolvedAccessLevels: Array<{ id: string; name: string }> | undefined;
  if (input.accessLevelIds && input.accessLevelIds.length > 0) {
    const facilityLevels = await repository.listAccessLevels(facility.id);
    const levelMap = new Map(facilityLevels.map((al) => [al.id, al.name]));
    resolvedAccessLevels = input.accessLevelIds.map((id) => ({
      id,
      name: levelMap.get(id) ?? "Access Level",
    }));
  }

  const qrCodeValidNum =
    input.tapQuota?.mode === "limited"
      ? (input.tapQuota.maxTaps ?? 1)
      : 0;

  // 5. Dispatch to HikCentral OpenAPI
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
        facePhotoData: input.facePhoto,
        accessLevels: resolvedAccessLevels,
        qrCodeValidNum,
      },
      {
        mode: input.mode,
        stubScenario: input.stubScenario,
      },
    );
  } catch (error) {
    const isHikError = error instanceof HikCentralError;
    return {
      ok: false,
      error: {
        kind: isHikError && error.kind === "config" ? "config" : "upstream",
        message: error instanceof Error ? error.message : "HikCentral appointment failed.",
        status: isHikError ? error.status : undefined,
        code: isHikError ? error.code : undefined,
      },
    };
  }

  // 5. Build and persist Visit record
  const currentTimeIso = getNow().toISOString();
  const monitoringFlag = parseMonitoringListFlag(hikResult);
  const visitStatus = monitoringFlag ? "SECURITY_ESCALATED" : "PENDING_APPROVAL";

  const visit: Visit = {
    id: generateId(),
    facilityId: facility.id,
    facilityName: facility.name,
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
    facePhoto: input.facePhoto ? toJpegDataUri(input.facePhoto) : undefined,
    accessLevelIds: input.accessLevelIds,
    tapQuota: input.tapQuota,
    credentialSyncStatus: "Applied",
    hikCentral: {
      appointRecordId: hikResult.appointRecordId,
      visitorId: hikResult.visitorId,
      appointCode: hikResult.appointCode,
      qrCodeImage: hikResult.qrCodeImage,
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
 * 1. Validates visit existence and ensures status is cancellable (DRAFT, PENDING_APPROVAL, APPROVED).
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
