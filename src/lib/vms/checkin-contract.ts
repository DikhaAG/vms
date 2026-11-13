/**
 * Isomorphic VMS Check-in contracts, runtime guards, and pure input validators.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

import {
  isCertificateType,
  isPreRegistrationMode,
  isStubScenario,
  isVisitReasonType,
  isVisitStatus,
  CERTIFICATE_TYPES,
  FORBIDDEN_HIKCENTRAL_CHARS,
  VISIT_REASON_TYPES,
  type CertificateType,
  type CredentialSyncStatus,
  type PreRegistrationMode,
  type StubScenario,
  type VisitReasonType,
  type VisitStatus,
} from "./vms-contract";
import {
  validateTapQuota,
  type TapQuotaConfig,
} from "./access-level-contract";

export const VERIFICATION_METHODS = [
  "qr",
  "manual",
  "biometric",
  "id_card",
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export function isVerificationMethod(value: unknown): value is VerificationMethod {
  return (
    typeof value === "string" &&
    (VERIFICATION_METHODS as readonly string[]).includes(value)
  );
}

export interface CheckInInput {
  visitId: string;
  receptionistUserId: string;
  receptionistName?: string;
  verificationMethod?: VerificationMethod;
  actualCheckInTimeUtc?: string;
  notes?: string;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export interface WalkInRegistrationInput {
  facilityId: string;
  hostId?: string;
  hostName?: string;
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  certificateType?: CertificateType;
  certificateNo?: string;
  visitReasonType: VisitReasonType;
  visitReasonDetail?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  accessLevelIds?: string[];
  tapQuota?: TapQuotaConfig;
  facePhoto?: string;
  receptionistUserId: string;
  receptionistName?: string;
  verificationMethod?: VerificationMethod;
  notes?: string;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export interface VisitorSearchQuery {
  query: string;
  facilityId?: string;
  status?: VisitStatus | VisitStatus[];
}

export interface CheckInAuditEvent {
  id: string;
  visitId: string;
  checkedInAtUtc: string;
  receptionistUserId: string;
  receptionistName?: string;
  verificationMethod: VerificationMethod;
  notes?: string;
}

export interface CheckInPass {
  visitId: string;
  visitorName: string;
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  certificateNo?: string;
  hostId?: string;
  hostName?: string;
  facilityId: string;
  facilityName?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualCheckInTimeUtc: string;
  qrCodeImage?: string;
  pinCode?: string;
  appointRecordId: string;
  visitorId: string;
  credentialSyncStatus: CredentialSyncStatus;
  accessLevelNames?: string[];
}

export interface CheckInValidationSuccess {
  valid: true;
  input: CheckInInput;
}

export interface CheckInValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type CheckInValidationOutcome =
  | CheckInValidationSuccess
  | CheckInValidationFailure;

export function validateCheckInInput(raw: unknown): CheckInValidationOutcome {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const record = raw as Record<string, unknown>;

  const visitId =
    typeof record.visitId === "string" ? record.visitId.trim() : "";
  if (!visitId) {
    errors.visitId = "Visit ID is required.";
  }

  const receptionistUserId =
    typeof record.receptionistUserId === "string"
      ? record.receptionistUserId.trim()
      : "";
  if (!receptionistUserId) {
    errors.receptionistUserId = "Receptionist User ID is required.";
  }

  let verificationMethod: VerificationMethod | undefined;
  if (
    record.verificationMethod !== undefined &&
    record.verificationMethod !== null
  ) {
    if (isVerificationMethod(record.verificationMethod)) {
      verificationMethod = record.verificationMethod;
    } else {
      errors.verificationMethod = `Verification method must be one of: ${VERIFICATION_METHODS.join(", ")}.`;
    }
  }

  let actualCheckInTimeUtc: string | undefined;
  if (
    record.actualCheckInTimeUtc !== undefined &&
    record.actualCheckInTimeUtc !== null
  ) {
    if (typeof record.actualCheckInTimeUtc === "string") {
      const parsed = Date.parse(record.actualCheckInTimeUtc);
      if (isNaN(parsed)) {
        errors.actualCheckInTimeUtc = "Invalid actual check-in time format.";
      } else {
        actualCheckInTimeUtc = new Date(parsed).toISOString();
      }
    } else {
      errors.actualCheckInTimeUtc = "Actual check-in time must be a string.";
    }
  }

  let mode: PreRegistrationMode | undefined;
  if (record.mode !== undefined && record.mode !== null) {
    if (isPreRegistrationMode(record.mode)) {
      mode = record.mode;
    } else {
      errors.mode = "Invalid pre-registration mode.";
    }
  }

  let stubScenario: StubScenario | undefined;
  if (record.stubScenario !== undefined && record.stubScenario !== null) {
    if (isStubScenario(record.stubScenario)) {
      stubScenario = record.stubScenario;
    } else {
      errors.stubScenario = "Invalid stub scenario.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input: {
      visitId,
      receptionistUserId,
      receptionistName:
        typeof record.receptionistName === "string"
          ? record.receptionistName.trim()
          : undefined,
      verificationMethod,
      actualCheckInTimeUtc,
      notes:
        typeof record.notes === "string" ? record.notes.trim() : undefined,
      mode,
      stubScenario,
    },
  };
}

export interface WalkInValidationSuccess {
  valid: true;
  input: WalkInRegistrationInput;
}

export interface WalkInValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type WalkInValidationOutcome =
  | WalkInValidationSuccess
  | WalkInValidationFailure;

export function validateWalkInRegistrationInput(
  raw: unknown,
): WalkInValidationOutcome {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const record = raw as Record<string, unknown>;

  // Facility ID
  const facilityId =
    typeof record.facilityId === "string" ? record.facilityId.trim() : "";
  if (!facilityId) {
    errors.facilityId = "Facility is required.";
  }

  // Receptionist User ID
  const receptionistUserId =
    typeof record.receptionistUserId === "string"
      ? record.receptionistUserId.trim()
      : "";
  if (!receptionistUserId) {
    errors.receptionistUserId = "Receptionist user ID is required.";
  }

  // Visitor Names
  const visitorFamilyName =
    typeof record.visitorFamilyName === "string"
      ? record.visitorFamilyName.trim()
      : "";
  if (!visitorFamilyName) {
    errors.visitorFamilyName = "Visitor family name is required.";
  } else if (visitorFamilyName.length > 256) {
    errors.visitorFamilyName =
      "Visitor family name must be at most 256 characters.";
  } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorFamilyName)) {
    errors.visitorFamilyName =
      "Visitor family name cannot contain special characters like ' / \\ : * ? \" < > |";
  }

  const visitorGivenName =
    typeof record.visitorGivenName === "string"
      ? record.visitorGivenName.trim()
      : "";
  if (!visitorGivenName) {
    errors.visitorGivenName = "Visitor given name is required.";
  } else if (visitorGivenName.length > 256) {
    errors.visitorGivenName =
      "Visitor given name must be at most 256 characters.";
  } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorGivenName)) {
    errors.visitorGivenName =
      "Visitor given name cannot contain special characters like ' / \\ : * ? \" < > |";
  }

  // Phone
  let visitorPhone: string | undefined;
  if (record.visitorPhone !== undefined && record.visitorPhone !== null) {
    if (typeof record.visitorPhone === "string") {
      visitorPhone = record.visitorPhone.trim();
      if (visitorPhone.length > 20) {
        errors.visitorPhone = "Phone number must be at most 20 characters.";
      }
    } else {
      errors.visitorPhone = "Phone number must be a string.";
    }
  }

  // Email
  let visitorEmail: string | undefined;
  if (record.visitorEmail !== undefined && record.visitorEmail !== null) {
    if (typeof record.visitorEmail === "string") {
      visitorEmail = record.visitorEmail.trim();
      if (visitorEmail && !visitorEmail.includes("@")) {
        errors.visitorEmail = "Email must be a valid email address.";
      }
    } else {
      errors.visitorEmail = "Email must be a string.";
    }
  }

  // Certificate
  let certificateType: CertificateType | undefined;
  let certificateNo: string | undefined;
  if (record.certificateType !== undefined && record.certificateType !== null) {
    if (isCertificateType(record.certificateType)) {
      certificateType = record.certificateType;
    } else {
      errors.certificateType = `Certificate type must be one of: ${CERTIFICATE_TYPES.join(", ")}.`;
    }
  }

  if (record.certificateNo !== undefined && record.certificateNo !== null) {
    if (typeof record.certificateNo === "string") {
      certificateNo = record.certificateNo.trim();
      if (certificateNo.length > 20) {
        errors.certificateNo =
          "Certificate number must be at most 20 characters.";
      }
      if (certificateNo && certificateType === undefined) {
        errors.certificateType =
          "Certificate type is required when certificate number is provided.";
      }
    } else {
      errors.certificateNo = "Certificate number must be a string.";
    }
  }

  // Visit Reason
  let visitReasonType: VisitReasonType = 0;
  if (record.visitReasonType !== undefined && record.visitReasonType !== null) {
    if (isVisitReasonType(record.visitReasonType)) {
      visitReasonType = record.visitReasonType;
    } else {
      errors.visitReasonType = `Visit reason type must be one of: ${VISIT_REASON_TYPES.join(", ")}.`;
    }
  } else {
    errors.visitReasonType = "Visit reason type is required.";
  }

  let visitReasonDetail: string | undefined;
  if (
    record.visitReasonDetail !== undefined &&
    record.visitReasonDetail !== null
  ) {
    if (typeof record.visitReasonDetail === "string") {
      visitReasonDetail = record.visitReasonDetail.trim();
      if (visitReasonDetail.length > 128) {
        errors.visitReasonDetail =
          "Visit reason detail must be at most 128 characters.";
      }
    } else {
      errors.visitReasonDetail = "Visit reason detail must be a string.";
    }
  }

  if (
    visitReasonType === 4 &&
    (!visitReasonDetail || visitReasonDetail.length === 0)
  ) {
    errors.visitReasonDetail =
      "Visit reason detail is required when reason type is 'Others' (4).";
  }

  // Optional start/end times (default to current time and +4 hours if omitted)
  const scheduledStartTime =
    typeof record.scheduledStartTime === "string"
      ? record.scheduledStartTime.trim()
      : undefined;
  const scheduledEndTime =
    typeof record.scheduledEndTime === "string"
      ? record.scheduledEndTime.trim()
      : undefined;

  if (scheduledStartTime && scheduledEndTime) {
    const startParsed = Date.parse(scheduledStartTime);
    const endParsed = Date.parse(scheduledEndTime);
    if (isNaN(startParsed)) {
      errors.scheduledStartTime = "Invalid start time format.";
    }
    if (isNaN(endParsed)) {
      errors.scheduledEndTime = "Invalid end time format.";
    }
    if (!isNaN(startParsed) && !isNaN(endParsed) && endParsed <= startParsed) {
      errors.scheduledEndTime = "Scheduled end time must be after start time.";
    }
  }

  // Face photo (optional)
  let facePhoto: string | undefined;
  if (record.facePhoto !== undefined && record.facePhoto !== null) {
    if (typeof record.facePhoto === "string") {
      facePhoto = record.facePhoto.trim() || undefined;
    } else {
      errors.facePhoto = "Face photo must be a string.";
    }
  }

  // Access Levels (optional)
  let accessLevelIds: string[] | undefined;
  if (record.accessLevelIds !== undefined && record.accessLevelIds !== null) {
    if (Array.isArray(record.accessLevelIds)) {
      accessLevelIds = record.accessLevelIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter(Boolean);
    } else {
      errors.accessLevelIds = "accessLevelIds must be an array of strings.";
    }
  }

  // Tap Quota (optional)
  let tapQuota: TapQuotaConfig | undefined;
  if (record.tapQuota !== undefined && record.tapQuota !== null) {
    const quotaValidation = validateTapQuota(record.tapQuota);
    if (quotaValidation.valid) {
      tapQuota = quotaValidation.quota;
    } else {
      for (const [key, msg] of Object.entries(quotaValidation.errors)) {
        errors[`tapQuota.${key}`] = msg;
      }
    }
  }

  // Verification method
  let verificationMethod: VerificationMethod | undefined;
  if (
    record.verificationMethod !== undefined &&
    record.verificationMethod !== null
  ) {
    if (isVerificationMethod(record.verificationMethod)) {
      verificationMethod = record.verificationMethod;
    } else {
      errors.verificationMethod = `Verification method must be one of: ${VERIFICATION_METHODS.join(", ")}.`;
    }
  }

  // Mode and stubScenario
  let mode: PreRegistrationMode | undefined;
  if (record.mode !== undefined && record.mode !== null) {
    if (isPreRegistrationMode(record.mode)) {
      mode = record.mode;
    } else {
      errors.mode = "Invalid mode.";
    }
  }

  let stubScenario: StubScenario | undefined;
  if (record.stubScenario !== undefined && record.stubScenario !== null) {
    if (isStubScenario(record.stubScenario)) {
      stubScenario = record.stubScenario;
    } else {
      errors.stubScenario = "Invalid stub scenario.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input: {
      facilityId,
      hostId:
        typeof record.hostId === "string" ? record.hostId.trim() : undefined,
      hostName:
        typeof record.hostName === "string"
          ? record.hostName.trim()
          : undefined,
      visitorFamilyName,
      visitorGivenName,
      visitorPhone,
      visitorEmail,
      certificateType,
      certificateNo,
      visitReasonType,
      visitReasonDetail,
      scheduledStartTime,
      scheduledEndTime,
      accessLevelIds,
      tapQuota,
      facePhoto,
      receptionistUserId,
      receptionistName:
        typeof record.receptionistName === "string"
          ? record.receptionistName.trim()
          : undefined,
      verificationMethod,
      notes:
        typeof record.notes === "string" ? record.notes.trim() : undefined,
      mode,
      stubScenario,
    },
  };
}

export interface SearchValidationSuccess {
  valid: true;
  input: VisitorSearchQuery;
}

export interface SearchValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type SearchValidationOutcome =
  | SearchValidationSuccess
  | SearchValidationFailure;

export function validateVisitorSearchQuery(
  raw: unknown,
): SearchValidationOutcome {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Search parameters must be an object." },
    };
  }

  const record = raw as Record<string, unknown>;
  const query = typeof record.query === "string" ? record.query.trim() : "";
  const facilityId =
    typeof record.facilityId === "string" && record.facilityId.trim()
      ? record.facilityId.trim()
      : undefined;

  let status: VisitStatus | VisitStatus[] | undefined;
  if (record.status !== undefined && record.status !== null) {
    if (Array.isArray(record.status)) {
      const validStatuses = record.status.filter(isVisitStatus);
      if (validStatuses.length > 0) {
        status = validStatuses;
      }
    } else if (isVisitStatus(record.status)) {
      status = record.status;
    }
  }

  return {
    valid: true,
    input: {
      query,
      facilityId,
      status,
    },
  };
}
