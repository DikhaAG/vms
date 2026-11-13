import {
  type SelfRegistrationResult,
  type SelfRegistrationSubmissionInput,
  validateSelfRegistrationSubmission,
} from "./invitation-contract";
import { validateInvitationToken } from "./invitation-service";
import {
  dispatchHikCentralAppointment,
  type DispatchAppointmentOptions,
  type HikCentralAppointmentParams,
  type HikCentralAppointmentSuccess,
} from "./hikcentral-appointment-adapter";
import { defaultVmsRepository, type IVmsRepository } from "./repository";
import {
  getBase64ByteSize,
  isFacePhotoSizeValid,
  MAX_FACE_PHOTO_BYTES,
  MIN_FACE_PHOTO_BYTES,
  stripDataUriPrefix,
  toJpegDataUri,
} from "./face-normalizer";
import { HikCentralError } from "../hikcentral/client";
import type { Visit } from "./vms-contract";
import { parseMonitoringListFlag } from "./hikcentral-approval-adapter";

export interface SelfRegistrationServiceDeps {
  repository?: IVmsRepository;
  appointmentDispatcher?: (
    params: HikCentralAppointmentParams,
    options?: DispatchAppointmentOptions,
  ) => Promise<HikCentralAppointmentSuccess>;
  now?: () => Date;
}

/**
 * Processes an external visitor self-registration submission:
 * 1. Validates invitation token (expiry, single-use, existence).
 * 2. Validates visitor identity inputs and face photo compliance.
 * 3. Enrolls appointment and face photo to HikCentral OpenAPI.
 * 4. Updates Visit record to PENDING_APPROVAL with credentials and status.
 * 5. Consumes invitation token to enforce single-use security.
 */
export async function processSelfRegistration(
  token: string,
  rawSubmission: SelfRegistrationSubmissionInput,
  deps: SelfRegistrationServiceDeps = {},
): Promise<SelfRegistrationResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const dispatchAppointment =
    deps.appointmentDispatcher ?? dispatchHikCentralAppointment;
  const getNow = deps.now ?? (() => new Date());

  // 1. Validate token state
  const validation = await validateInvitationToken(token, {
    repository,
    now: getNow,
  });

  if (!validation.valid) {
    return {
      ok: false,
      error: {
        kind:
          validation.status === "invalid"
            ? "not_found"
            : validation.status === "expired"
              ? "expired"
              : "consumed",
        message: validation.error,
        status: validation.status === "invalid" ? 404 : 410,
      },
    };
  }

  const { visit } = validation;

  // 2. Validate visitor submission
  const submissionOutcome = validateSelfRegistrationSubmission(rawSubmission);
  if (!submissionOutcome.valid) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Visitor submission validation failed.",
        fieldErrors: submissionOutcome.errors,
        status: 400,
      },
    };
  }

  const submission = submissionOutcome.input;

  // 3. Biometric face photo validation
  let wirePhotoBase64: string | undefined;
  let formattedDataUriPhoto: string | undefined;

  if (submission.facePhoto) {
    const byteSize = getBase64ByteSize(submission.facePhoto);
    if (!isFacePhotoSizeValid(byteSize)) {
      return {
        ok: false,
        error: {
          kind: "validation",
          message: `Face photo must be between ${MIN_FACE_PHOTO_BYTES / 1024} KB and ${MAX_FACE_PHOTO_BYTES / 1024} KB (actual: ${(byteSize / 1024).toFixed(1)} KB).`,
          fieldErrors: {
            facePhoto: `Face photo must be between 10 KB and 100 KB (received ${(byteSize / 1024).toFixed(1)} KB).`,
          },
          status: 400,
        },
      };
    }
    wirePhotoBase64 = stripDataUriPrefix(submission.facePhoto);
    formattedDataUriPhoto = toJpegDataUri(submission.facePhoto);
  }

  // 4. Dispatch appointment to HikCentral OpenAPI
  let hikResult: HikCentralAppointmentSuccess;
  try {
    hikResult = await dispatchAppointment(
      {
        hostId: visit.hostId,
        appointStartTime: visit.scheduledStartTimeFacility,
        appointEndTime: visit.scheduledEndTimeFacility,
        visitReasonType: visit.visitReasonType,
        visitReasonDetail: visit.visitReasonDetail,
        visitorFamilyName: submission.visitorFamilyName,
        visitorGivenName: submission.visitorGivenName,
        visitorPhone: submission.visitorPhone,
        visitorEmail: submission.visitorEmail,
        certificateType: submission.certificateType,
        certificateNo: submission.certificateNo,
        facePhotoData: wirePhotoBase64,
      },
      {
        mode: submission.mode,
        stubScenario: submission.stubScenario,
      },
    );
  } catch (error) {
    const isHikError = error instanceof HikCentralError;
    const kind = isHikError && error.kind === "config" ? "config" : "upstream";
    return {
      ok: false,
      error: {
        kind,
        message:
          error instanceof Error
            ? error.message
            : "HikCentral appointment synchronization failed.",
        status: kind === "config" ? 500 : 502,
        code: isHikError ? error.code : undefined,
      },
    };
  }

  // 5. Update Visit record and consume token
  const nowIso = getNow().toISOString();

  const formattedQrDataUri = hikResult.qrCodeImage
    ? hikResult.qrCodeImage.startsWith("data:")
      ? hikResult.qrCodeImage
      : `data:image/png;base64,${hikResult.qrCodeImage}`
    : undefined;

  const monitoringFlag = parseMonitoringListFlag(hikResult);
  const status = monitoringFlag ? "SECURITY_ESCALATED" : "PENDING_APPROVAL";

  const visitUpdates: Partial<Visit> = {
    visitorFamilyName: submission.visitorFamilyName,
    visitorGivenName: submission.visitorGivenName,
    visitorPhone: submission.visitorPhone,
    visitorEmail: submission.visitorEmail,
    certificateType: submission.certificateType,
    certificateNo: submission.certificateNo,
    facePhoto: formattedDataUriPhoto,
    status,
    monitoringListFlag: monitoringFlag,
    credentialSyncStatus: "Applied",
    hikCentral: {
      appointRecordId: hikResult.appointRecordId,
      visitorId: hikResult.visitorId,
      appointCode: hikResult.appointCode,
      qrCodeImage: formattedQrDataUri,
    },
    updatedAtUtc: nowIso,
  };

  const updatedVisit = await repository.updateVisit(visit.id, visitUpdates);

  // Consume token to prevent replay
  await repository.consumeInvitationToken(token, nowIso);

  return {
    ok: true,
    visit: updatedVisit,
    qrPass: {
      appointRecordId: hikResult.appointRecordId,
      visitorId: hikResult.visitorId,
      appointCode: hikResult.appointCode,
      qrCodeImage: formattedQrDataUri,
    },
  };
}
