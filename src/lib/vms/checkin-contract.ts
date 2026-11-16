/**
 * Isomorphic VMS Check-in contracts, runtime guards, and pure input validators.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

import { z } from "zod";
import {
  FORBIDDEN_HIKCENTRAL_CHARS,
  certificateTypeSchema,
  preRegistrationModeSchema,
  stubScenarioSchema,
  visitReasonTypeSchema,
  visitStatusSchema,
  type CredentialSyncStatus,
} from "./vms-contract";
import { tapQuotaSchema } from "./access-level-contract";
import { formatZodErrors, isRecord } from "./validation-helpers";

export const VERIFICATION_METHODS = [
  "qr",
  "manual",
  "biometric",
  "id_card",
] as const;
export const verificationMethodSchema = z.enum(VERIFICATION_METHODS, {
  error: `Verification method must be one of: ${VERIFICATION_METHODS.join(", ")}.`,
});
export type VerificationMethod = z.infer<typeof verificationMethodSchema>;

export function isVerificationMethod(
  value: unknown,
): value is VerificationMethod {
  return verificationMethodSchema.safeParse(value).success;
}

export const checkInInputSchema = z
  .object({
    visitId: z
      .string({ error: "Visit ID is required." })
      .trim()
      .min(1, "Visit ID is required."),
    receptionistUserId: z
      .string({ error: "Receptionist User ID is required." })
      .trim()
      .min(1, "Receptionist User ID is required."),
    receptionistName: z.string().trim().optional(),
    verificationMethod: verificationMethodSchema.optional(),
    actualCheckInTimeUtc: z.string().optional(),
    notes: z.string().trim().optional(),
    mode: preRegistrationModeSchema.optional(),
    stubScenario: stubScenarioSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actualCheckInTimeUtc) {
      const parsed = Date.parse(data.actualCheckInTimeUtc);
      if (isNaN(parsed)) {
        ctx.addIssue({
          code: "custom",
          path: ["actualCheckInTimeUtc"],
          message: "Invalid actual check-in time format.",
        });
      }
    }
  });
export type CheckInInput = z.infer<typeof checkInInputSchema>;

export const walkInRegistrationSchema = z
  .object({
    facilityId: z.string().trim().optional(),
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
    visitorPhone: z.string().trim().max(20).optional(),
    visitorEmail: z
      .string()
      .trim()
      .refine((val) => !val || val.includes("@"), {
        message: "Email must be a valid email address.",
      })
      .optional(),
    certificateType: certificateTypeSchema.optional(),
    certificateNo: z.string().trim().max(20).optional(),
    visitReasonType: visitReasonTypeSchema,
    visitReasonDetail: z.string().trim().max(128).optional(),
    scheduledStartTime: z.string().trim().optional(),
    scheduledEndTime: z.string().trim().optional(),
    accessLevelIds: z.array(z.string().trim()).optional(),
    tapQuota: tapQuotaSchema.optional(),
    facePhoto: z.string().trim().optional(),
    receptionistUserId: z
      .string({ error: "Receptionist user ID is required." })
      .trim()
      .min(1, "Receptionist user ID is required."),
    receptionistName: z.string().trim().optional(),
    verificationMethod: verificationMethodSchema.optional(),
    notes: z.string().trim().max(500).optional(),
    mode: preRegistrationModeSchema.optional(),
    stubScenario: stubScenarioSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.visitReasonType === 4 &&
      (!data.visitReasonDetail || !data.visitReasonDetail.trim())
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["visitReasonDetail"],
        message:
          "Visit reason detail is required when reason type is 'Others' (4).",
      });
    }
  });
export type WalkInRegistrationInput = z.infer<typeof walkInRegistrationSchema>;

export const visitorSearchQuerySchema = z.object({
  query: z.string().default(""),
  facilityId: z.string().optional(),
  status: z.union([visitStatusSchema, z.array(visitStatusSchema)]).optional(),
});
export type VisitorSearchQuery = z.infer<typeof visitorSearchQuerySchema>;

export const checkInAuditEventSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  checkedInAtUtc: z.string(),
  receptionistUserId: z.string(),
  receptionistName: z.string().optional(),
  verificationMethod: verificationMethodSchema,
  notes: z.string().optional(),
});
export type CheckInAuditEvent = z.infer<typeof checkInAuditEventSchema>;

export const checkInPassSchema = z.object({
  visitId: z.string(),
  visitorName: z.string(),
  visitorFamilyName: z.string(),
  visitorGivenName: z.string(),
  visitorPhone: z.string().optional(),
  visitorEmail: z.string().optional(),
  certificateNo: z.string().optional(),
  hostId: z.string().optional(),
  hostName: z.string().optional(),
  facilityId: z.string().optional(),
  facilityName: z.string().optional(),
  scheduledStartTime: z.string(),
  scheduledEndTime: z.string(),
  actualCheckInTimeUtc: z.string(),
  qrCodeImage: z.string().optional(),
  pinCode: z.string().optional(),
  appointRecordId: z.string(),
  visitorId: z.string(),
  credentialSyncStatus: z.custom<CredentialSyncStatus>(),
  accessLevelNames: z.array(z.string()).optional(),
});
export type CheckInPass = z.infer<typeof checkInPassSchema>;

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
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = checkInInputSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  const actualCheckInTimeUtc = result.data.actualCheckInTimeUtc
    ? new Date(Date.parse(result.data.actualCheckInTimeUtc)).toISOString()
    : undefined;

  return {
    valid: true,
    input: {
      visitId: result.data.visitId,
      receptionistUserId: result.data.receptionistUserId,
      receptionistName: result.data.receptionistName,
      verificationMethod: result.data.verificationMethod,
      actualCheckInTimeUtc,
      notes: result.data.notes,
      mode: result.data.mode,
      stubScenario: result.data.stubScenario,
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
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = walkInRegistrationSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return {
    valid: true,
    input: {
      facilityId: result.data.facilityId,
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
      facePhoto: result.data.facePhoto,
      receptionistUserId: result.data.receptionistUserId,
      receptionistName: result.data.receptionistName,
      verificationMethod: result.data.verificationMethod,
      notes: result.data.notes,
      mode: result.data.mode,
      stubScenario: result.data.stubScenario,
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
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Search parameters must be an object." },
    };
  }

  const result = visitorSearchQuerySchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return {
    valid: true,
    input: {
      query: result.data.query.trim(),
      facilityId: result.data.facilityId?.trim() || undefined,
      status: result.data.status,
    },
  };
}
