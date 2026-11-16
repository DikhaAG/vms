/**
 * Isomorphic Group Visit contracts, types, runtime guards, and pure input validators.
 * Free of Node.js dependencies — safe for Client Components.
 */

import { z } from "zod";
import {
  FORBIDDEN_HIKCENTRAL_CHARS,
  certificateTypeSchema,
  visitReasonTypeSchema,
  visitStatusSchema,
  preRegistrationModeSchema,
  stubScenarioSchema,
} from "./vms-contract";
import { tapQuotaSchema } from "./access-level-contract";
import { formatZodErrors, isRecord } from "./validation-helpers";

export const visitorPersonalDetailsSchema = z.object({
  visitorFamilyName: z
    .string({ error: "Family name is required." })
    .trim()
    .min(1, "Family name is required.")
    .max(256, "Family name must be at most 256 characters.")
    .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
      message:
        "Family name cannot contain special characters like ' / \\ : * ? \" < > |",
    }),
  visitorGivenName: z
    .string({ error: "Given name is required." })
    .trim()
    .min(1, "Given name is required.")
    .max(256, "Given name must be at most 256 characters.")
    .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
      message:
        "Given name cannot contain special characters like ' / \\ : * ? \" < > |",
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
  facePhoto: z
    .string({ error: "Face photo must be a string." })
    .trim()
    .optional(),
});
export type VisitorPersonalDetails = z.infer<
  typeof visitorPersonalDetailsSchema
>;

export const groupVisitInputSchema = z
  .object({
    hostId: z.string().trim().optional(),
    hostName: z.string().trim().optional(),
    visitorGroupName: z
      .string({ error: "Visitor group name is required." })
      .trim()
      .min(1, "Visitor group name is required.")
      .max(128, "Visitor group name must be at most 128 characters.")
      .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
        message:
          "Visitor group name cannot contain special characters like ' / \\ : * ? \" < > |",
      }),
    scheduledStartTime: z
      .string({ error: "Scheduled start time is required." })
      .trim()
      .min(1, "Scheduled start time is required."),
    scheduledEndTime: z
      .string({ error: "Scheduled end time is required." })
      .trim()
      .min(1, "Scheduled end time is required."),
    scheduledStartTimeUtc: z.string().trim().optional(),
    scheduledEndTimeUtc: z.string().trim().optional(),
    visitReasonType: visitReasonTypeSchema,
    visitReasonDetail: z
      .string({ error: "Visit reason detail must be a string." })
      .trim()
      .max(128, "Visit reason detail must be at most 128 characters.")
      .optional(),
    accessLevelIds: z.array(z.string().trim()).optional(),
    tapQuota: tapQuotaSchema.optional(),
    visitors: z
      .array(visitorPersonalDetailsSchema, {
        error: "At least one visitor is required for a group visit.",
      })
      .min(1, "At least one visitor is required for a group visit."),
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
export type GroupVisitInput = z.infer<typeof groupVisitInputSchema>;

export const memberVisitResultSchema = z.object({
  visitId: z.string(),
  visitorName: z.string(),
  status: visitStatusSchema,
  error: z.string().optional(),
  appointCode: z.string().optional(),
  qrCodeImage: z.string().optional(),
  certificateNo: z.string().optional(),
});
export type MemberVisitResult = z.infer<typeof memberVisitResultSchema>;

export const groupVisitResultSchema = z.object({
  groupId: z.string(),
  visitorGroupName: z.string(),
  memberVisits: z.array(memberVisitResultSchema),
  successCount: z.number(),
  failureCount: z.number(),
});
export type GroupVisitResult = z.infer<typeof groupVisitResultSchema>;

export const visitorProfileSchema = z.object({
  id: z.string(),
  certificateType: certificateTypeSchema,
  certificateNo: z.string(),
  fullName: z.string(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  facePhoto: z.string().optional(),
  isDeleted: z.boolean(),
  deletionReason: z.string().optional(),
  deletedAtUtc: z.string().optional(),
  visitCount: z.number().optional(),
  createdAtUtc: z.string(),
  updatedAtUtc: z.string(),
});
export type VisitorProfile = z.infer<typeof visitorProfileSchema>;

export const softDeleteProfileSchema = z.object({
  isDeleted: z.boolean({ error: "isDeleted must be a boolean." }),
  reason: z.string({ error: "Reason must be a string." }).trim().optional(),
});
export type SoftDeleteProfileInput = z.infer<typeof softDeleteProfileSchema>;

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
 * Pure validator for group visit registration input. Backward-compatible wrapper.
 */
export function validateGroupVisitInput(raw: unknown): GroupValidationOutcome {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = groupVisitInputSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return {
    valid: true,
    input: {
      ...result.data,
      tapQuota: result.data.tapQuota
        ? {
            mode: result.data.tapQuota.mode,
            maxTaps:
              result.data.tapQuota.mode === "unlimited"
                ? 0
                : result.data.tapQuota.maxTaps ?? 0,
          }
        : undefined,
      visitors: result.data.visitors.map((v) => ({
        ...v,
        certificateType:
          v.certificateNo && v.certificateType === undefined
            ? 111
            : v.certificateType,
      })),
      mode: result.data.mode || "live",
    },
  };
}

/**
 * Pure validator for soft delete input requests. Backward-compatible wrapper.
 */
export function validateSoftDeleteInput(
  raw: unknown,
): SoftDeleteValidationOutcome {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = softDeleteProfileSchema.safeParse(raw);
  if (result.success) {
    return {
      valid: true,
      input: {
        isDeleted: result.data.isDeleted,
        reason: result.data.reason || undefined,
      },
    };
  }

  return { valid: false, errors: formatZodErrors(result.error) };
}
