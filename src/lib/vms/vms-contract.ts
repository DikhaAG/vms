/**
 * Isomorphic VMS contracts, types, runtime guards, and pure input validators.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

export const VISIT_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "REJECTED",
  "CANCELLED",
  "OVERSTAY",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const VISIT_REASON_TYPES = [0, 1, 2, 3, 4] as const;
export type VisitReasonType = (typeof VISIT_REASON_TYPES)[number];

export const VISIT_REASON_LABELS: Record<VisitReasonType, string> = {
  0: "Business",
  1: "Training",
  2: "Visit",
  3: "Meeting",
  4: "Others",
};

export const CERTIFICATE_TYPES = [111, 414, 335, 222] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  111: "National ID / KTP",
  414: "Passport",
  335: "Driver's License / SIM",
  222: "Exit-Entry Permit",
};

export const PRE_REGISTRATION_MODES = ["live", "stub"] as const;
export type PreRegistrationMode = (typeof PRE_REGISTRATION_MODES)[number];

export const STUB_SCENARIOS = [
  "success",
  "auth-error",
  "network-error",
] as const;
export type StubScenario = (typeof STUB_SCENARIOS)[number];

export interface Facility {
  id: string;
  name: string;
  timezone: string;
  address?: string;
  overstayGraceMinutes?: number;
}

export interface HikCentralVisitReference {
  appointRecordId: string;
  visitorId: string;
  appointCode?: string;
  qrCodeImage?: string;
}

export interface Visit {
  id: string;
  facilityId: string;
  facilityName?: string;
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
  scheduledStartTimeUtc: string;
  scheduledEndTimeUtc: string;
  scheduledStartTimeFacility: string;
  scheduledEndTimeFacility: string;
  status: VisitStatus;
  hikCentral?: HikCentralVisitReference;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreatePreRegistrationInput {
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
  scheduledStartTime: string;
  scheduledEndTime: string;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export type PreRegistrationErrorKind =
  | "validation"
  | "not_found"
  | "config"
  | "network"
  | "upstream";

export interface PreRegistrationError {
  kind: PreRegistrationErrorKind;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
  code?: string;
}

export interface PreRegistrationResult {
  ok: boolean;
  visit?: Visit;
  error?: PreRegistrationError;
}

export function isVisitStatus(value: unknown): value is VisitStatus {
  return (
    typeof value === "string" &&
    (VISIT_STATUSES as readonly string[]).includes(value)
  );
}

export function isVisitReasonType(value: unknown): value is VisitReasonType {
  return (
    typeof value === "number" &&
    (VISIT_REASON_TYPES as readonly number[]).includes(value)
  );
}

export function isCertificateType(value: unknown): value is CertificateType {
  return (
    typeof value === "number" &&
    (CERTIFICATE_TYPES as readonly number[]).includes(value)
  );
}

export function isPreRegistrationMode(
  value: unknown,
): value is PreRegistrationMode {
  return (
    typeof value === "string" &&
    (PRE_REGISTRATION_MODES as readonly string[]).includes(value)
  );
}

export function isStubScenario(value: unknown): value is StubScenario {
  return (
    typeof value === "string" &&
    (STUB_SCENARIOS as readonly string[]).includes(value)
  );
}

export const FORBIDDEN_HIKCENTRAL_CHARS = /['\/\\:*?"<>|]/;

export interface ValidationSuccess {
  valid: true;
  input: CreatePreRegistrationInput;
}

export interface ValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type ValidationOutcome = ValidationSuccess | ValidationFailure;

/**
 * Pure validator for pre-registration input.
 */
export function validatePreRegistrationInput(raw: unknown): ValidationOutcome {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "Request payload must be an object." } };
  }

  const record = raw as Record<string, unknown>;

  // Facility ID
  const facilityId = typeof record.facilityId === "string" ? record.facilityId.trim() : "";
  if (!facilityId) {
    errors.facilityId = "Facility is required.";
  }

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

  // Mode and stubScenario
  let mode: PreRegistrationMode | undefined;
  if (record.mode !== undefined && record.mode !== null) {
    if (isPreRegistrationMode(record.mode)) {
      mode = record.mode;
    } else {
      errors.mode = `Mode must be one of: ${PRE_REGISTRATION_MODES.join(", ")}.`;
    }
  }

  let stubScenario: StubScenario | undefined;
  if (record.stubScenario !== undefined && record.stubScenario !== null) {
    if (isStubScenario(record.stubScenario)) {
      stubScenario = record.stubScenario;
    } else {
      errors.stubScenario = `Stub scenario must be one of: ${STUB_SCENARIOS.join(", ")}.`;
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
      mode,
      stubScenario,
    },
  };
}
