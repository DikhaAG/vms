/**
 * Isomorphic Group Visit contracts, types, runtime guards, and pure input validators.
 * Free of Node.js dependencies — safe for Client Components.
 */

import {
  type CertificateType,
  type VisitReasonType,
  type VisitStatus,
  type PreRegistrationMode,
  type StubScenario,
  CERTIFICATE_TYPES,
  VISIT_REASON_TYPES,
  FORBIDDEN_HIKCENTRAL_CHARS,
  isCertificateType,
  isVisitReasonType,
  isPreRegistrationMode,
  isStubScenario,
} from "./vms-contract";
import {
  validateTapQuota,
  type TapQuotaConfig,
} from "./access-level-contract";

export interface VisitorPersonalDetails {
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  certificateType?: CertificateType;
  certificateNo?: string;
  facePhoto?: string;
}

export interface GroupVisitInput {
  facilityId: string;
  hostId?: string;
  hostName?: string;
  visitorGroupName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledStartTimeUtc?: string;
  scheduledEndTimeUtc?: string;
  visitReasonType: VisitReasonType;
  visitReasonDetail?: string;
  accessLevelIds?: string[];
  tapQuota?: TapQuotaConfig;
  visitors: Array<VisitorPersonalDetails & { facePhoto?: string }>;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export interface MemberVisitResult {
  visitId: string;
  visitorName: string;
  status: VisitStatus;
  error?: string;
  appointCode?: string;
  qrCodeImage?: string;
  certificateNo?: string;
}

export interface GroupVisitResult {
  groupId: string;
  visitorGroupName: string;
  memberVisits: MemberVisitResult[];
  successCount: number;
  failureCount: number;
}

export interface VisitorProfile {
  id: string;
  certificateType: CertificateType;
  certificateNo: string;
  fullName: string;
  familyName?: string;
  givenName?: string;
  phone?: string;
  email?: string;
  facePhoto?: string;
  isDeleted: boolean;
  deletionReason?: string;
  deletedAtUtc?: string;
  visitCount?: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface SoftDeleteProfileInput {
  isDeleted: boolean;
  reason?: string;
}

export interface GroupValidationSuccess {
  valid: true;
  input: GroupVisitInput;
}

export interface GroupValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type GroupValidationOutcome =
  | GroupValidationSuccess
  | GroupValidationFailure;

export interface SoftDeleteValidationSuccess {
  valid: true;
  input: SoftDeleteProfileInput;
}

export interface SoftDeleteValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type SoftDeleteValidationOutcome =
  | SoftDeleteValidationSuccess
  | SoftDeleteValidationFailure;

/**
 * Pure validator for group visit registration input.
 */
export function validateGroupVisitInput(raw: unknown): GroupValidationOutcome {
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

  // Visitor Group Name
  const visitorGroupName =
    typeof record.visitorGroupName === "string"
      ? record.visitorGroupName.trim()
      : "";
  if (!visitorGroupName) {
    errors.visitorGroupName = "Visitor group name is required.";
  } else if (visitorGroupName.length > 128) {
    errors.visitorGroupName =
      "Visitor group name must be at most 128 characters.";
  } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorGroupName)) {
    errors.visitorGroupName =
      "Visitor group name cannot contain special characters like ' / \\ : * ? \" < > |";
  }

  // Scheduled Start and End Times
  const scheduledStartTime =
    typeof record.scheduledStartTime === "string"
      ? record.scheduledStartTime.trim()
      : typeof record.scheduledStartTimeUtc === "string"
        ? record.scheduledStartTimeUtc.trim()
        : "";
  if (!scheduledStartTime) {
    errors.scheduledStartTime = "Scheduled start time is required.";
  }

  const scheduledEndTime =
    typeof record.scheduledEndTime === "string"
      ? record.scheduledEndTime.trim()
      : typeof record.scheduledEndTimeUtc === "string"
        ? record.scheduledEndTimeUtc.trim()
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
        errors.scheduledEndTime =
          "Scheduled end time must be after start time.";
      }
    }
  }

  // Visit Reason
  let visitReasonType: VisitReasonType = 0;
  if (
    record.visitReasonType !== undefined &&
    record.visitReasonType !== null
  ) {
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

  // Access Levels (optional)
  let accessLevelIds: string[] | undefined;
  if (
    record.accessLevelIds !== undefined &&
    record.accessLevelIds !== null
  ) {
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

  // Visitors list
  const rawVisitors = record.visitors;
  const validatedVisitors: Array<VisitorPersonalDetails & { facePhoto?: string }> =
    [];

  if (!Array.isArray(rawVisitors) || rawVisitors.length === 0) {
    errors.visitors = "At least one visitor is required for a group visit.";
  } else {
    rawVisitors.forEach((vis, idx) => {
      const prefix = `visitors[${idx}]`;
      if (typeof vis !== "object" || vis === null) {
        errors[`${prefix}`] = "Visitor must be an object.";
        return;
      }

      const vRecord = vis as Record<string, unknown>;

      const visitorFamilyName =
        typeof vRecord.visitorFamilyName === "string"
          ? vRecord.visitorFamilyName.trim()
          : "";
      if (!visitorFamilyName) {
        errors[`${prefix}.visitorFamilyName`] = "Family name is required.";
      } else if (visitorFamilyName.length > 256) {
        errors[`${prefix}.visitorFamilyName`] =
          "Family name must be at most 256 characters.";
      } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorFamilyName)) {
        errors[`${prefix}.visitorFamilyName`] =
          "Family name cannot contain special characters like ' / \\ : * ? \" < > |";
      }

      const visitorGivenName =
        typeof vRecord.visitorGivenName === "string"
          ? vRecord.visitorGivenName.trim()
          : "";
      if (!visitorGivenName) {
        errors[`${prefix}.visitorGivenName`] = "Given name is required.";
      } else if (visitorGivenName.length > 256) {
        errors[`${prefix}.visitorGivenName`] =
          "Given name must be at most 256 characters.";
      } else if (FORBIDDEN_HIKCENTRAL_CHARS.test(visitorGivenName)) {
        errors[`${prefix}.visitorGivenName`] =
          "Given name cannot contain special characters like ' / \\ : * ? \" < > |";
      }

      let visitorPhone: string | undefined;
      if (
        vRecord.visitorPhone !== undefined &&
        vRecord.visitorPhone !== null
      ) {
        if (typeof vRecord.visitorPhone === "string") {
          visitorPhone = vRecord.visitorPhone.trim();
          if (visitorPhone.length > 20) {
            errors[`${prefix}.visitorPhone`] =
              "Phone number must be at most 20 characters.";
          }
        } else {
          errors[`${prefix}.visitorPhone`] = "Phone number must be a string.";
        }
      }

      let visitorEmail: string | undefined;
      if (
        vRecord.visitorEmail !== undefined &&
        vRecord.visitorEmail !== null
      ) {
        if (typeof vRecord.visitorEmail === "string") {
          visitorEmail = vRecord.visitorEmail.trim();
          if (visitorEmail && !visitorEmail.includes("@")) {
            errors[`${prefix}.visitorEmail`] =
              "Email must be a valid email address.";
          }
        } else {
          errors[`${prefix}.visitorEmail`] = "Email must be a string.";
        }
      }

      let certificateType: CertificateType | undefined;
      let certificateNo: string | undefined;
      if (
        vRecord.certificateType !== undefined &&
        vRecord.certificateType !== null
      ) {
        if (isCertificateType(vRecord.certificateType)) {
          certificateType = vRecord.certificateType;
        } else {
          errors[`${prefix}.certificateType`] =
            `Certificate type must be one of: ${CERTIFICATE_TYPES.join(", ")}.`;
        }
      }

      if (
        vRecord.certificateNo !== undefined &&
        vRecord.certificateNo !== null
      ) {
        if (typeof vRecord.certificateNo === "string") {
          certificateNo = vRecord.certificateNo.trim();
          if (certificateNo.length > 20) {
            errors[`${prefix}.certificateNo`] =
              "Certificate number must be at most 20 characters.";
          }
          if (certificateNo && certificateType === undefined) {
            // Default to National ID (111) if not explicitly set
            certificateType = 111;
          }
        } else {
          errors[`${prefix}.certificateNo`] =
            "Certificate number must be a string.";
        }
      }

      let facePhoto: string | undefined;
      if (vRecord.facePhoto !== undefined && vRecord.facePhoto !== null) {
        if (typeof vRecord.facePhoto === "string") {
          facePhoto = vRecord.facePhoto.trim() || undefined;
        } else {
          errors[`${prefix}.facePhoto`] = "Face photo must be a string.";
        }
      }

      validatedVisitors.push({
        visitorFamilyName,
        visitorGivenName,
        visitorPhone,
        visitorEmail,
        certificateType,
        certificateNo,
        facePhoto,
      });
    });
  }

  // Optional mode and stubScenario
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
      facilityId,
      hostId:
        typeof record.hostId === "string" ? record.hostId.trim() : undefined,
      hostName:
        typeof record.hostName === "string"
          ? record.hostName.trim()
          : undefined,
      visitorGroupName,
      scheduledStartTime,
      scheduledEndTime,
      scheduledStartTimeUtc:
        typeof record.scheduledStartTimeUtc === "string"
          ? record.scheduledStartTimeUtc.trim()
          : undefined,
      scheduledEndTimeUtc:
        typeof record.scheduledEndTimeUtc === "string"
          ? record.scheduledEndTimeUtc.trim()
          : undefined,
      visitReasonType,
      visitReasonDetail,
      accessLevelIds,
      tapQuota,
      visitors: validatedVisitors,
      mode,
      stubScenario,
    },
  };
}

/**
 * Pure validator for soft delete input requests.
 */
export function validateSoftDeleteInput(
  raw: unknown,
): SoftDeleteValidationOutcome {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const record = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof record.isDeleted !== "boolean") {
    errors.isDeleted = "isDeleted must be a boolean.";
  }

  let reason: string | undefined;
  if (record.reason !== undefined && record.reason !== null) {
    if (typeof record.reason === "string") {
      reason = record.reason.trim();
    } else {
      errors.reason = "Reason must be a string.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input: {
      isDeleted: record.isDeleted as boolean,
      reason,
    },
  };
}
