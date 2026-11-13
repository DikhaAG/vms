import { randomUUID } from "node:crypto";
import {
  validatePreRegistrationInput,
  type CreatePreRegistrationInput,
  type PreRegistrationResult,
  type Visit,
} from "./vms-contract";
import { formatFacilityIso, parseLocalDateTimeToUtc } from "./timezone";
import {
  dispatchHikCentralAppointment,
  type DispatchAppointmentOptions,
  type HikCentralAppointmentParams,
  type HikCentralAppointmentSuccess,
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

  // 4. Dispatch to HikCentral OpenAPI
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
