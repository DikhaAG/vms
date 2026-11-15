/**
 * Isomorphic contracts, types, runtime guards, and pure input validators
 * for Visitor Invitation Links and Self-Registration.
 * Free of Node.js dependencies and process.env reads — safe for Client Components.
 */

import { z } from "zod";
import {
  FORBIDDEN_HIKCENTRAL_CHARS,
  certificateTypeSchema,
  preRegistrationModeSchema,
  stubScenarioSchema,
  visitReasonTypeSchema,
  type Visit,
} from "./vms-contract";
import { formatZodErrors, isRecord } from "./validation-helpers";

export const INVITATION_STATUSES = [
  "valid",
  "invalid",
  "expired",
  "consumed",
] as const;
export const invitationStatusSchema = z.enum(INVITATION_STATUSES);
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return invitationStatusSchema.safeParse(value).success;
}

export const invitationTokenSchema = z.object({
  token: z.string(),
  visitId: z.string(),
  expiresAtUtc: z.string(),
  isConsumed: z.boolean(),
  consumedAtUtc: z.string().optional(),
  createdAtUtc: z.string(),
});
export type InvitationToken = z.infer<typeof invitationTokenSchema>;

export const createInvitationSchema = z
  .object({
    facilityId: z
      .string({ error: "Facility is required." })
      .trim()
      .min(1, "Facility is required."),
    hostId: z.string().trim().optional(),
    hostName: z.string().trim().optional(),
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
    visitorFamilyName: z
      .string({ error: "Visitor family name must be a string." })
      .trim()
      .max(256, "Visitor family name must be at most 256 characters.")
      .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
        message:
          "Visitor family name cannot contain special characters like ' / \\ : * ? \" < > |",
      })
      .optional(),
    visitorGivenName: z
      .string({ error: "Visitor given name must be a string." })
      .trim()
      .max(256, "Visitor given name must be at most 256 characters.")
      .refine((val) => !FORBIDDEN_HIKCENTRAL_CHARS.test(val), {
        message:
          "Visitor given name cannot contain special characters like ' / \\ : * ? \" < > |",
      })
      .optional(),
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
    expiresInDays: z
      .number({ error: "Expiry in days must be a positive number." })
      .positive("Expiry in days must be a positive number.")
      .optional(),
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
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

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

export const publicInvitationMetadataSchema = z.object({
  token: z.string(),
  visitId: z.string(),
  status: invitationStatusSchema,
  facility: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string().optional(),
    timezone: z.string(),
  }),
  host: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  visitReasonType: visitReasonTypeSchema,
  visitReasonLabel: z.string(),
  visitReasonDetail: z.string().optional(),
  scheduledStartTimeFacility: z.string(),
  scheduledEndTimeFacility: z.string(),
  scheduledStartTimeUtc: z.string(),
  scheduledEndTimeUtc: z.string(),
  expiresAtUtc: z.string(),
  isConsumed: z.boolean(),
  prefilledVisitor: z
    .object({
      familyName: z.string().optional(),
      givenName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
    .optional(),
});
export type PublicInvitationMetadata = z.infer<
  typeof publicInvitationMetadataSchema
>;

export const selfRegistrationSubmissionSchema = z
  .object({
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
    facePhoto: z
      .string({ error: "Face photo must be a string." })
      .trim()
      .optional(),
    mode: preRegistrationModeSchema.optional(),
    stubScenario: stubScenarioSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.certificateNo && data.certificateNo.trim() && data.certificateType === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["certificateType"],
        message:
          "Certificate type is required when certificate number is provided.",
      });
    }
  });
export type SelfRegistrationSubmissionInput = z.infer<
  typeof selfRegistrationSubmissionSchema
>;

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
    kind:
      | "validation"
      | "not_found"
      | "expired"
      | "consumed"
      | "config"
      | "upstream";
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
 * Pure validator for creating an invitation. Backward-compatible wrapper.
 */
export function validateCreateInvitationInput(
  raw: unknown,
): ValidationOutcome<CreateInvitationInput> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = createInvitationSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return { valid: true, input: result.data };
}

/**
 * Pure validator for self-registration submission from invited visitor. Backward-compatible wrapper.
 */
export function validateSelfRegistrationSubmission(
  raw: unknown,
): ValidationOutcome<SelfRegistrationSubmissionInput> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = selfRegistrationSubmissionSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  return { valid: true, input: result.data };
}
