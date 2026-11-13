/**
 * Isomorphic contracts, types, runtime guards, and pure input validators
 * for Visitor Invitation Links and Self-Registration.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

import {
  type CertificateType,
  CERTIFICATE_TYPES,
  FORBIDDEN_HIKCENTRAL_CHARS,
  isCertificateType,
  isPreRegistrationMode,
  isStubScenario,
  isVisitReasonType,
  type PreRegistrationMode,
  type StubScenario,
  type Visit,
  type VisitReasonType,
  VISIT_REASON_TYPES,
} from "./vms-contract";

export const INVITATION_STATUSES = [
  "valid",
  "invalid",
  "expired",
  "consumed",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return (
    typeof value === "string" &&
    (INVITATION_STATUSES as readonly string[]).includes(value)
  );
}

export interface InvitationToken {
  token: string;
  visitId: string;
  expiresAtUtc: string;
  isConsumed: boolean;
  consumedAtUtc?: string;
  createdAtUtc: string;
}

export interface CreateInvitationInput {
  facilityId: string;
  hostId?: string;
  hostName?: string;
  visitReasonType: VisitReasonType;
  visitReasonDetail?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  visitorFamilyName?: string;
  visitorGivenName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  expiresInDays?: number;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export interface CreateInvitationResult {
  ok: boolean;
  invitation?: InvitationToken;
  inviteUrl?: string;
  visit?: Visit;
  error?: {
    kind: "validation" | "not_found" | "config" | "network" | "upstream";
    message: string;
    fieldErrors?: Record<string, string>;
    status?: number;
    code?: string;
  };
}

export interface PublicInvitationMetadata {
  token: string;
  visitId: string;
  status: InvitationStatus;
  facility: {
    id: string;
    name: string;
    address?: string;
    timezone: string;
  };
  host?: {
    id?: string;
    name?: string;
  };
  visitReasonType: VisitReasonType;
  visitReasonLabel: string;
  visitReasonDetail?: string;
  scheduledStartTimeFacility: string;
  scheduledEndTimeFacility: string;
  scheduledStartTimeUtc: string;
  scheduledEndTimeUtc: string;
  expiresAtUtc: string;
  isConsumed: boolean;
  prefilledVisitor?: {
    familyName?: string;
    givenName?: string;
    phone?: string;
    email?: string;
  };
}

export interface SelfRegistrationSubmissionInput {
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  certificateType?: CertificateType;
  certificateNo?: string;
  facePhoto?: string;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export interface SelfRegistrationResult {
  ok: boolean;
  visit?: Visit;
  qrPass?: {
    appointRecordId: string;
    visitorId: string;
    appointCode?: string;
    qrCodeImage?: string;
  };
  error?: {
    kind: "validation" | "not_found" | "expired" | "consumed" | "config" | "upstream";
    message: string;
    fieldErrors?: Record<string, string>;
    status?: number;
    code?: string;
  };
}

export interface ValidationSuccess<T> {
  valid: true;
  input: T;
}

export interface ValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type ValidationOutcome<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Pure validator for creating an invitation.
 */
export function validateCreateInvitationInput(
  raw: unknown,
): ValidationOutcome<CreateInvitationInput> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "Request payload must be an object." } };
  }

  const record = raw as Record<string, unknown>;

  // Facility ID
  const facilityId =
    typeof record.facilityId === "string" ? record.facilityId.trim() : "";
  if (!facilityId) {
    errors.facilityId = "Facility is required.";
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
  if (record.visitReasonDetail !== undefined && record.visitReasonDetail !== null) {
    if (typeof record.visitReasonDetail === "string") {
      visitReasonDetail = record.visitReasonDetail.trim();
      if (visitReasonDetail.length > 128) {
        errors.visitReasonDetail = "Visit reason detail must be at most 128 characters.";
      }
    } else {
      errors.visitReasonDetail = "Visit reason detail must be a string.";
    }
  }

  if (visitReasonType === 4 && (!visitReasonDetail || visitReasonDetail.length === 0)) {
    errors.visitReasonDetail = "Visit reason detail is required when reason type is 'Others' (4).";
  }

  // Scheduled Start and End Times
  const scheduledStartTime =
    typeof record.scheduledStartTime === "string"
      ? record.scheduledStartTime.trim()
      : "";
  if (!scheduledStartTime) {
    errors.scheduledStartTime = "Scheduled start time is required.";
  }

  const scheduledEndTime =
    typeof record.scheduledEndTime === "string"
      ? record.scheduledEndTime.trim()
      : "";
  if (!scheduledEndTime) {
    errors.scheduledEndTime = "Scheduled end time is required.";
  }

  if (scheduledStartTime && scheduledEndTime) {
    const startDate = new Date(
      scheduledStartTime.includes("Z") || /[+-]\d{2}/.test(scheduledStartTime)
        ? scheduledStartTime
        : scheduledStartTime + "Z",
    );
    const endDate = new Date(
      scheduledEndTime.includes("Z") || /[+-]\d{2}/.test(scheduledEndTime)
        ? scheduledEndTime
        : scheduledEndTime + "Z",
    );

    if (isNaN(startDate.getTime())) {
      errors.scheduledStartTime = "Invalid start time format.";
    }
    if (isNaN(endDate.getTime())) {
      errors.scheduledEndTime = "Invalid end time format.";
    }

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      if (endDate.getTime() <= startDate.getTime()) {
        errors.scheduledEndTime = "Scheduled end time must be after start time.";
      }
    }
  }

  // Optional visitor prefilled fields
  let visitorFamilyName: string | undefined;
  if (record.visitorFamilyName !== undefined && record.visitorFamilyName !== null) {
    if (typeof record.visitorFamilyName === "string") {
      visitorFamilyName = record.visitorFamilyName.trim();
      if (visitorFamilyName.length > 256) {
        errors.visitorFamilyName = "Visitor family name must be at most 256 characters.";
      } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorFamilyName)) {
        errors.visitorFamilyName =
          "Visitor family name cannot contain special characters like ' / \\ : * ? \" < > |";
      }
    } else {
      errors.visitorFamilyName = "Visitor family name must be a string.";
    }
  }

  let visitorGivenName: string | undefined;
  if (record.visitorGivenName !== undefined && record.visitorGivenName !== null) {
    if (typeof record.visitorGivenName === "string") {
      visitorGivenName = record.visitorGivenName.trim();
      if (visitorGivenName.length > 256) {
        errors.visitorGivenName = "Visitor given name must be at most 256 characters.";
      } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorGivenName)) {
        errors.visitorGivenName =
          "Visitor given name cannot contain special characters like ' / \\ : * ? \" < > |";
      }
    } else {
      errors.visitorGivenName = "Visitor given name must be a string.";
    }
  }

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

  let expiresInDays: number | undefined;
  if (record.expiresInDays !== undefined && record.expiresInDays !== null) {
    if (typeof record.expiresInDays === "number" && record.expiresInDays > 0) {
      expiresInDays = record.expiresInDays;
    } else {
      errors.expiresInDays = "Expiry in days must be a positive number.";
    }
  }

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
      hostId: typeof record.hostId === "string" ? record.hostId.trim() : undefined,
      hostName: typeof record.hostName === "string" ? record.hostName.trim() : undefined,
      visitReasonType,
      visitReasonDetail,
      scheduledStartTime,
      scheduledEndTime,
      visitorFamilyName: visitorFamilyName || undefined,
      visitorGivenName: visitorGivenName || undefined,
      visitorPhone: visitorPhone || undefined,
      visitorEmail: visitorEmail || undefined,
      expiresInDays,
      mode,
      stubScenario,
    },
  };
}

/**
 * Pure validator for self-registration submission from invited visitor.
 */
export function validateSelfRegistrationSubmission(
  raw: unknown,
): ValidationOutcome<SelfRegistrationSubmissionInput> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "Request payload must be an object." } };
  }

  const record = raw as Record<string, unknown>;

  // Visitor Names
  const visitorFamilyName =
    typeof record.visitorFamilyName === "string"
      ? record.visitorFamilyName.trim()
      : "";
  if (!visitorFamilyName) {
    errors.visitorFamilyName = "Visitor family name is required.";
  } else if (visitorFamilyName.length > 256) {
    errors.visitorFamilyName = "Visitor family name must be at most 256 characters.";
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
    errors.visitorGivenName = "Visitor given name must be at most 256 characters.";
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
        errors.certificateNo = "Certificate number must be at most 20 characters.";
      }
      if (certificateNo && certificateType === undefined) {
        errors.certificateType = "Certificate type is required when certificate number is provided.";
      }
    } else {
      errors.certificateNo = "Certificate number must be a string.";
    }
  }

  // Face Photo
  let facePhoto: string | undefined;
  if (record.facePhoto !== undefined && record.facePhoto !== null) {
    if (typeof record.facePhoto === "string") {
      facePhoto = record.facePhoto.trim() || undefined;
    } else {
      errors.facePhoto = "Face photo must be a string.";
    }
  }

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
      visitorFamilyName,
      visitorGivenName,
      visitorPhone,
      visitorEmail,
      certificateType,
      certificateNo,
      facePhoto,
      mode,
      stubScenario,
    },
  };
}
