/**
 * Isomorphic VMS contracts, types, runtime guards, and pure input validators.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

import type { MonitoringListFlag, ApprovalRecord } from "./approval-contract";
import {
  validateTapQuota,
  type TapQuotaConfig,
} from "./access-level-contract";
import { isValidIanaTimezone } from "./timezone";

export const VISIT_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "SECURITY_ESCALATED",
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
  "face-quality-failed",
  "sync-failed",
  "sync-pending",
  "monitoring-list-flagged",
] as const;
export type StubScenario = (typeof STUB_SCENARIOS)[number];

export const CREDENTIAL_SYNC_STATUSES = [
  "Applied",
  "Syncing",
  "Failed",
  "Unknown",
] as const;
export type CredentialSyncStatus = (typeof CREDENTIAL_SYNC_STATUSES)[number];

export interface Facility {
  id: string;
  name: string;
  timezone: string;
  address?: string;
  overstayGraceMinutes?: number;
}

export interface HostEmployee {
  id: string; // Internal host/person ID (or personCode / personId)
  personCode?: string;
  name: string;
  email?: string;
  phone?: string;
  orgIndexCode?: string;
  departmentName?: string;
}

export interface HikCentralVisitReference {
  appointRecordId: string;
  visitorId: string;
  appointCode?: string;
  qrCodeImage?: string;
  pinCode?: string;
}

export interface Visit {
  id: string;
  facilityId: string;
  facilityName?: string;
  groupId?: string;
  visitorGroupName?: string;
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
  actualCheckInTimeUtc?: string;
  actualCheckOutTimeUtc?: string;
  tapCount?: number;
  checkOutReason?: string;
  cancelReason?: string;
  remark?: string;
  isForcedCheckOut?: boolean;
  checkedOutByUserId?: string;
  status: VisitStatus;
  facePhoto?: string;
  credentialSyncStatus?: CredentialSyncStatus;
  hikCentral?: HikCentralVisitReference;
  invitationToken?: string;
  monitoringListFlag?: MonitoringListFlag;
  approvalRecord?: ApprovalRecord;
  accessLevelIds?: string[];
  tapQuota?: TapQuotaConfig;
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
  facePhoto?: string;
  accessLevelIds?: string[];
  tapQuota?: TapQuotaConfig;
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
      facePhoto,
      accessLevelIds,
      tapQuota,
      mode,
      stubScenario,
    },
  };
}

export interface UpdateFacilityInput {
  name?: string;
  timezone?: string;
  overstayGraceMinutes?: number;
  address?: string;
}

export type FacilityValidationOutcome =
  | { valid: true; input: UpdateFacilityInput }
  | { valid: false; errors: Record<string, string> };

/**
 * Pure validator for facility update configuration payloads.
 */
export function validateUpdateFacilityInput(
  raw: unknown,
): FacilityValidationOutcome {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be a JSON object." },
    };
  }

  const rec = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const input: UpdateFacilityInput = {};

  if (rec.name !== undefined) {
    if (typeof rec.name !== "string" || !rec.name.trim()) {
      errors.name = "Facility name must not be empty.";
    } else {
      input.name = rec.name.trim();
    }
  }

  if (rec.timezone !== undefined) {
    if (
      typeof rec.timezone !== "string" ||
      !isValidIanaTimezone(rec.timezone.trim())
    ) {
      errors.timezone = `Invalid IANA timezone identifier: "${rec.timezone}".`;
    } else {
      input.timezone = rec.timezone.trim();
    }
  }

  if (rec.overstayGraceMinutes !== undefined) {
    if (
      typeof rec.overstayGraceMinutes !== "number" ||
      isNaN(rec.overstayGraceMinutes) ||
      rec.overstayGraceMinutes < 0
    ) {
      errors.overstayGraceMinutes =
        "overstayGraceMinutes must be a non-negative number.";
    } else {
      input.overstayGraceMinutes = Math.floor(rec.overstayGraceMinutes);
    }
  }

  if (rec.address !== undefined) {
    if (typeof rec.address !== "string") {
      errors.address = "address must be a string.";
    } else {
      input.address = rec.address.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, input };
}
