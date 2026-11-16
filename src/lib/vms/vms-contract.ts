/**
 * Isomorphic VMS contracts, types, runtime guards, and pure input validators.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

import { z } from "zod";
import type { MonitoringListFlag, ApprovalRecord } from "./approval-contract";
import { tapQuotaSchema } from "./access-level-contract";
import { isValidIanaTimezone } from "./timezone";
import {
  PRE_REGISTRATION_MODES,
  preRegistrationModeSchema,
  type PreRegistrationMode,
} from "./pre-registration-mode-contract";
import {
  DOOR_ACCESS_TYPES,
  EMERGENCY_GRANT_STATUSES,
  isDoorAccessType,
  isEmergencyGrantActive,
  isEmergencyGrantStatus,
  validateGrantEmergencyAccessInput,
  doorSchema,
  facilityDoorSchema,
  type Door,
  type DoorAccessType,
  type EmergencyAccessGrant,
  type EmergencyGrantStatus,
  type FacilityDoor,
  type GrantEmergencyAccessInput,
  type VisitLastSeenDoor,
} from "./checkout-contract";
import { formatZodErrors, isRecord } from "./validation-helpers";

export {
  DOOR_ACCESS_TYPES,
  EMERGENCY_GRANT_STATUSES,
  doorSchema,
  facilityDoorSchema,
  isDoorAccessType,
  isEmergencyGrantActive,
  isEmergencyGrantStatus,
  validateGrantEmergencyAccessInput,
  type Door,
  type DoorAccessType,
  type EmergencyAccessGrant,
  type EmergencyGrantStatus,
  type FacilityDoor,
  type GrantEmergencyAccessInput,
  type VisitLastSeenDoor,
};

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
export const visitStatusSchema = z.enum(VISIT_STATUSES);
export type VisitStatus = z.infer<typeof visitStatusSchema>;

export const VISIT_REASON_TYPES = [0, 1, 2, 3, 4] as const;
const [firstReason, ...restReasons] = VISIT_REASON_TYPES.map((t) =>
  z.literal(t),
);
export const visitReasonTypeSchema = z.union(
  [firstReason, ...restReasons],
  {
    error: (issue) => {
      if (issue.input === undefined || issue.input === null) {
        return "Visit reason type is required.";
      }
      return `Visit reason type must be one of: ${VISIT_REASON_TYPES.join(", ")}.`;
    },
  },
);
export type VisitReasonType = (typeof VISIT_REASON_TYPES)[number];

export const VISIT_REASON_LABELS: Record<VisitReasonType, string> = {
  0: "Business",
  1: "Training",
  2: "Visit",
  3: "Meeting",
  4: "Others",
};

export const CERTIFICATE_TYPES = [111, 414, 335, 222] as const;
const [firstCert, ...restCerts] = CERTIFICATE_TYPES.map((t) => z.literal(t));
export const certificateTypeSchema = z.union([firstCert, ...restCerts], {
  error: (issue) => {
    if (issue.input === undefined || issue.input === null) {
      return "Certificate type is required.";
    }
    return `Certificate type must be one of: ${CERTIFICATE_TYPES.join(", ")}.`;
  },
});
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  111: "National ID / KTP",
  414: "Passport",
  335: "Driver's License / SIM",
  222: "Exit-Entry Permit",
};

export { PRE_REGISTRATION_MODES, preRegistrationModeSchema, type PreRegistrationMode };

export const STUB_SCENARIOS = [
  "success",
  "auth-error",
  "network-error",
  "face-quality-failed",
  "sync-failed",
  "sync-pending",
  "monitoring-list-flagged",
] as const;
export const stubScenarioSchema = z.enum(STUB_SCENARIOS, {
  error: `Stub scenario must be one of: ${STUB_SCENARIOS.join(", ")}.`,
});
export type StubScenario = z.infer<typeof stubScenarioSchema>;

export const CREDENTIAL_SYNC_STATUSES = [
  "Applied",
  "Syncing",
  "Failed",
  "Unknown",
] as const;
export const credentialSyncStatusSchema = z.enum(CREDENTIAL_SYNC_STATUSES);
export type CredentialSyncStatus = z.infer<typeof credentialSyncStatusSchema>;

export const hostEmployeeSchema = z.object({
  id: z.string(),
  personCode: z.string().optional(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  orgIndexCode: z.string().optional(),
  departmentName: z.string().optional(),
});
export type HostEmployee = z.infer<typeof hostEmployeeSchema>;

export const hikCentralVisitReferenceSchema = z.object({
  appointRecordId: z.string(),
  visitorId: z.string(),
  appointCode: z.string().optional(),
  qrCodeImage: z.string().optional(),
  pinCode: z.string().optional(),
});
export type HikCentralVisitReference = z.infer<
  typeof hikCentralVisitReferenceSchema
>;

export const visitSchema = z.object({
  id: z.string(),
  groupId: z.string().optional(),
  visitorGroupName: z.string().optional(),
  hostId: z.string().optional(),
  hostName: z.string().optional(),
  visitorFamilyName: z.string(),
  visitorGivenName: z.string(),
  visitorPhone: z.string().optional(),
  visitorEmail: z.string().optional(),
  certificateType: certificateTypeSchema.optional(),
  certificateNo: z.string().optional(),
  visitReasonType: visitReasonTypeSchema,
  visitReasonDetail: z.string().optional(),
  scheduledStartTimeUtc: z.string(),
  scheduledEndTimeUtc: z.string(),
  scheduledStartTimeFacility: z.string(),
  scheduledEndTimeFacility: z.string(),
  actualCheckInTimeUtc: z.string().optional(),
  actualCheckOutTimeUtc: z.string().optional(),
  tapCount: z.number().optional(),
  checkOutReason: z.string().optional(),
  cancelReason: z.string().optional(),
  remark: z.string().optional(),
  isForcedCheckOut: z.boolean().optional(),
  checkedOutByUserId: z.string().optional(),
  status: visitStatusSchema,
  facePhoto: z.string().optional(),
  credentialSyncStatus: credentialSyncStatusSchema.optional(),
  hikCentral: hikCentralVisitReferenceSchema.optional(),
  invitationToken: z.string().optional(),
  monitoringListFlag: z.custom<MonitoringListFlag>().optional(),
  approvalRecord: z.custom<ApprovalRecord>().optional(),
  accessLevelIds: z.array(z.string()).optional(),
  tapQuota: tapQuotaSchema.optional(),
  emergencyGrants: z.array(z.custom<EmergencyAccessGrant>()).optional(),
  lastSeenDoor: z.custom<VisitLastSeenDoor>().optional(),
  isFastTrack: z.boolean().optional(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
});
export type Visit = z.infer<typeof visitSchema>;

export const FORBIDDEN_HIKCENTRAL_CHARS = /['\/\\:*?"<>|]/;

export const createPreRegistrationSchema = z
  .object({
    hostId: z.string().trim().optional(),
    hostName: z.string().trim().optional(),
    visitorFamilyName: z
      .string({ error: "Visitor family name is required." })
      .trim()
      .min(1, "Visitor family name is required.")
      .max(256, "Visitor family name must be at most 256 characters.")
      .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
        message:
          "Visitor family name cannot contain special characters like ' / \\ : * ? \" < > |",
      }),
    visitorGivenName: z
      .string({ error: "Visitor given name is required." })
      .trim()
      .min(1, "Visitor given name is required.")
      .max(256, "Visitor given name must be at most 256 characters.")
      .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
        message:
          "Visitor given name cannot contain special characters like ' / \\ : * ? \" < > |",
      }),
    visitorPhone: z
      .string({ error: "Phone number must be a string." })
      .trim()
      .max(20, "Phone number must be at most 20 characters.")
      .optional(),
    visitorEmail: z
      .string({ error: "Email must be a string." })
      .trim()
      .refine((val) => !val || val.includes("@"), {
        message: "Email must be a valid email address.",
      })
      .optional(),
    certificateType: certificateTypeSchema.optional(),
    certificateNo: z
      .string({ error: "Certificate number must be a string." })
      .trim()
      .max(20, "Certificate number must be at most 20 characters.")
      .optional(),
    visitReasonType: visitReasonTypeSchema,
    visitReasonDetail: z
      .string({ error: "Visit reason detail must be a string." })
      .trim()
      .max(128, "Visit reason detail must be at most 128 characters.")
      .optional(),
    scheduledStartTime: z
      .string({ error: "Scheduled start time is required." })
      .trim()
      .min(1, "Scheduled start time is required."),
    scheduledEndTime: z
      .string({ error: "Scheduled end time is required." })
      .trim()
      .min(1, "Scheduled end time is required."),
    facePhoto: z
      .string({ error: "Face photo must be a string." })
      .trim()
      .optional(),
    accessLevelIds: z
      .array(z.string().trim(), {
        error: "accessLevelIds must be an array of strings.",
      })
      .optional(),
    tapQuota: tapQuotaSchema.optional(),
    mode: preRegistrationModeSchema.optional(),
    stubScenario: stubScenarioSchema.optional(),
  })
  .superRefine((data, ctx) => {
    // If certificateNo provided, certificateType is required
    if (data.certificateNo && data.certificateNo.trim().length > 0) {
      if (data.certificateType === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["certificateType"],
          message:
            "Certificate type is required when certificate number is provided.",
        });
      }
    }

    // Reason type 4 (Others) requires detail
    if (data.visitReasonType === 4) {
      if (!data.visitReasonDetail || !data.visitReasonDetail.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["visitReasonDetail"],
          message:
            "Visit reason detail is required when reason type is 'Others' (4).",
        });
      }
    }

    // Date range validation
    if (data.scheduledStartTime && data.scheduledEndTime) {
      const s = data.scheduledStartTime.trim();
      const e = data.scheduledEndTime.trim();
      const startMs = Date.parse(
        s.includes("Z") || /[+-]\d{2}/.test(s) ? s : `${s}Z`,
      );
      const endMs = Date.parse(
        e.includes("Z") || /[+-]\d{2}/.test(e) ? e : `${e}Z`,
      );

      if (isNaN(startMs)) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledStartTime"],
          message: "Invalid start time format.",
        });
      }
      if (isNaN(endMs)) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledEndTime"],
          message: "Invalid end time format.",
        });
      }
      if (!isNaN(startMs) && !isNaN(endMs) && endMs <= startMs) {
        ctx.addIssue({
          code: "custom",
          path: ["scheduledEndTime"],
          message: "Scheduled end time must be after start time.",
        });
      }
    }
  });
export type CreatePreRegistrationInput = z.infer<
  typeof createPreRegistrationSchema
>;

/** Canonical isomorphic alias for React Hook Form + Zod resolver integrations */
export const preRegistrationInputSchema = createPreRegistrationSchema;
export type PreRegistrationInput = CreatePreRegistrationInput;

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
  return visitStatusSchema.safeParse(value).success;
}

export function isVisitReasonType(value: unknown): value is VisitReasonType {
  return visitReasonTypeSchema.safeParse(value).success;
}

export function isCertificateType(value: unknown): value is CertificateType {
  return certificateTypeSchema.safeParse(value).success;
}

export function isPreRegistrationMode(
  value: unknown,
): value is PreRegistrationMode {
  return preRegistrationModeSchema.safeParse(value).success;
}

export function isStubScenario(value: unknown): value is StubScenario {
  return stubScenarioSchema.safeParse(value).success;
}

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
 * Pure validator for pre-registration input. Backward-compatible wrapper delegating to createPreRegistrationSchema.
 */
export function validatePreRegistrationInput(raw: unknown): ValidationOutcome {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = createPreRegistrationSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return {
    valid: true,
    input: {
      hostId: result.data.hostId,
      hostName: result.data.hostName,
      visitorFamilyName: result.data.visitorFamilyName,
      visitorGivenName: result.data.visitorGivenName,
      visitorPhone: result.data.visitorPhone,
      visitorEmail: result.data.visitorEmail,
      certificateType: result.data.certificateType,
      certificateNo: result.data.certificateNo,
      visitReasonType: result.data.visitReasonType,
      visitReasonDetail: result.data.visitReasonDetail,
      scheduledStartTime: result.data.scheduledStartTime,
      scheduledEndTime: result.data.scheduledEndTime,
      facePhoto: result.data.facePhoto,
      accessLevelIds: result.data.accessLevelIds,
      tapQuota: result.data.tapQuota
        ? {
            mode: result.data.tapQuota.mode,
            maxTaps:
              result.data.tapQuota.mode === "unlimited"
                ? 0
                : result.data.tapQuota.maxTaps ?? 0,
          }
        : undefined,
      mode: result.data.mode,
      stubScenario: result.data.stubScenario,
    },
  };
}

// ---------------------------------------------------------------------------
// Global System Settings (Single-Site Architecture)
// ---------------------------------------------------------------------------

export const DEFAULT_SYSTEM_SETTINGS = {
  siteName: "Gedung Utama",
  timezone: "Asia/Jakarta",
  overstayGraceMinutes: 15,
  autoCheckInEarlyBufferMinutes: 15,
} as const;

export const systemSettingsSchema = z.object({
  id: z.string().default("default"),
  siteName: z
    .string({ error: "Site name is required." })
    .trim()
    .min(1, "Site name is required.")
    .default(DEFAULT_SYSTEM_SETTINGS.siteName),
  timezone: z
    .string({ error: "Timezone is required." })
    .trim()
    .min(1, "Timezone is required.")
    .refine(isValidIanaTimezone, {
      message:
        "Timezone must be a valid IANA timezone identifier (e.g., 'Asia/Jakarta').",
    })
    .default(DEFAULT_SYSTEM_SETTINGS.timezone),
  overstayGraceMinutes: z
    .number({ error: "Overstay grace period must be a number." })
    .int("Overstay grace period must be an integer.")
    .min(0, "Overstay grace period cannot be negative.")
    .default(DEFAULT_SYSTEM_SETTINGS.overstayGraceMinutes),
  autoCheckInEarlyBufferMinutes: z
    .number({ error: "Auto check-in early buffer must be a number." })
    .int("Auto check-in early buffer must be an integer.")
    .min(0, "Auto check-in early buffer cannot be negative.")
    .default(DEFAULT_SYSTEM_SETTINGS.autoCheckInEarlyBufferMinutes),
  updatedAt: z.string().optional(),
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const updateSystemSettingsSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, "Site name cannot be empty.")
    .optional(),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone cannot be empty.")
    .refine(isValidIanaTimezone, {
      message:
        "Timezone must be a valid IANA timezone identifier (e.g., 'Asia/Jakarta').",
    })
    .optional(),
  overstayGraceMinutes: z
    .number({ error: "Overstay grace period must be a number." })
    .int("Overstay grace period must be an integer.")
    .min(0, "Overstay grace period cannot be negative.")
    .optional(),
  autoCheckInEarlyBufferMinutes: z
    .number({ error: "Auto check-in early buffer must be a number." })
    .int("Auto check-in early buffer must be an integer.")
    .min(0, "Auto check-in early buffer cannot be negative.")
    .optional(),
});
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;

export type SystemSettingsValidationOutcome =
  | { valid: true; input: UpdateSystemSettingsInput }
  | { valid: false; errors: Record<string, string> };

/**
 * Pure validator for system settings update payloads.
 */
export function validateUpdateSystemSettingsInput(
  raw: unknown,
): SystemSettingsValidationOutcome {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be a JSON object." },
    };
  }

  const result = updateSystemSettingsSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return {
    valid: true,
    input: {
      ...result.data,
      overstayGraceMinutes:
        typeof result.data.overstayGraceMinutes === "number"
          ? Math.floor(result.data.overstayGraceMinutes)
          : undefined,
      autoCheckInEarlyBufferMinutes:
        typeof result.data.autoCheckInEarlyBufferMinutes === "number"
          ? Math.floor(result.data.autoCheckInEarlyBufferMinutes)
          : undefined,
    },
  };
}
