/**
 * Isomorphic contracts, interfaces, and pure validators for Dynamic Access Level Management
 * (Door/Floor Bundling & Tap Quota).
 * Safe for Client Components (zero Node.js dependencies, zero process.env reads).
 */

import { z } from "zod";
import { formatZodErrors, isRecord } from "./validation-helpers";

export const TIME_SCHEDULE_TEMPLATES = [1, 2, 3] as const;
export type TimeScheduleTemplateId = (typeof TIME_SCHEDULE_TEMPLATES)[number];

export const TIME_SCHEDULE_LABELS: Record<TimeScheduleTemplateId, string> = {
  1: "All-Day Template (24/7)",
  2: "Workday Template (Mon-Fri 08:00-18:00)",
  3: "Holiday / Weekend Template",
};

export const TAP_QUOTA_MODES = ["unlimited", "limited"] as const;
export const FORBIDDEN_ACCESS_LEVEL_CHARS = /['\/\\:*?"<>|]/;

export interface ValidationSuccess<T> {
  valid: true;
  input: T;
}

export interface ValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type ValidationOutcome<T> = ValidationSuccess<T> | ValidationFailure;

const [firstSchedule, ...restSchedules] = TIME_SCHEDULE_TEMPLATES.map((id) =>
  z.literal(id),
);
export const timeScheduleTemplateIdSchema = z.union(
  [firstSchedule, ...restSchedules],
  {
    error: (issue) => {
      if (issue.input === undefined || issue.input === null) {
        return "Time schedule is required.";
      }
      return `Time schedule must be one of: ${TIME_SCHEDULE_TEMPLATES.join(", ")}.`;
    },
  },
);

export const tapQuotaModeSchema = z.enum(TAP_QUOTA_MODES, {
  error: `Tap quota mode must be one of: ${TAP_QUOTA_MODES.join(", ")}.`,
});
export type TapQuotaMode = z.infer<typeof tapQuotaModeSchema>;

export const tapQuotaSchema = z
  .object({
    mode: tapQuotaModeSchema,
    maxTaps: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "limited") {
      if (data.maxTaps === undefined || data.maxTaps === null) {
        ctx.addIssue({
          code: "custom",
          path: ["maxTaps"],
          message: "Exact tap limit (maxTaps) is required for limited mode.",
        });
      } else if (
        typeof data.maxTaps !== "number" ||
        !Number.isInteger(data.maxTaps) ||
        data.maxTaps < 1 ||
        data.maxTaps > 1000
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["maxTaps"],
          message: "Max taps must be an integer between 1 and 1000.",
        });
      }
    }
  });
export type TapQuotaConfig = z.infer<typeof tapQuotaSchema>;

export const accessLevelSchema = z.object({
  id: z.string(),
  facilityId: z.string(),
  name: z.string(),
  description: z.string(),
  doors: z.array(z.string()),
  floors: z.array(z.string()).optional(),
  timeScheduleId: timeScheduleTemplateIdSchema,
  isDefault: z.boolean(),
  createdAtUtc: z.string().optional(),
  updatedAtUtc: z.string().optional(),
});
export type AccessLevel = z.infer<typeof accessLevelSchema>;

export const createAccessLevelSchema = z
  .object({
    facilityId: z
      .string({ error: "Facility is required." })
      .trim()
      .min(1, "Facility is required."),
    name: z
      .string({ error: "Access level name is required." })
      .trim()
      .min(1, "Access level name is required.")
      .max(32, "Access level name must be at most 32 characters.")
      .refine((val) => !FORBIDDEN_ACCESS_LEVEL_CHARS.test(val), {
        message:
          "Access level name cannot contain special characters like ' / \\ : * ? \" < > |",
      }),
    description: z
      .string({ error: "Description must be a string." })
      .trim()
      .max(128, "Description must be at most 128 characters.")
      .optional()
      .default(""),
    doors: z
      .array(z.string().trim(), {
        error: "At least one door must be assigned to the access level.",
      })
      .min(1, "At least one door must be assigned to the access level.")
      .transform((arr) => arr.filter(Boolean))
      .refine((arr) => arr.length > 0, {
        message: "At least one non-empty door must be assigned.",
      }),
    floors: z
      .array(z.string().trim(), { error: "Floors must be an array of strings." })
      .optional()
      .transform((arr) => (arr ? arr.filter(Boolean) : undefined)),
    timeScheduleId: timeScheduleTemplateIdSchema,
    isDefault: z.boolean().optional().default(false),
  });
export type CreateAccessLevelInput = z.infer<typeof createAccessLevelSchema>;

export const updateAccessLevelSchema = z.object({
  facilityId: z.string().trim().min(1, "Facility ID cannot be empty.").optional(),
  name: z
    .string()
    .trim()
    .min(1, "Access level name cannot be empty.")
    .max(32, "Access level name must be at most 32 characters.")
    .refine((val) => !FORBIDDEN_ACCESS_LEVEL_CHARS.test(val), {
      message:
        "Access level name cannot contain special characters like ' / \\ : * ? \" < > |",
    })
    .optional(),
  description: z
    .string({ error: "Description must be a string." })
    .trim()
    .max(128, "Description must be at most 128 characters.")
    .optional(),
  doors: z
    .array(z.string().trim(), {
      error: "Doors must be a non-empty array of strings.",
    })
    .min(1, "Doors must be a non-empty array of strings.")
    .transform((arr) => arr.filter(Boolean))
    .refine((arr) => arr.length > 0, {
      message: "At least one non-empty door must be assigned.",
    })
    .optional(),
  floors: z
    .array(z.string().trim(), { error: "Floors must be an array of strings." })
    .optional()
    .transform((arr) => (arr ? arr.filter(Boolean) : undefined)),
  timeScheduleId: timeScheduleTemplateIdSchema.optional(),
  isDefault: z.boolean().optional(),
});
export type UpdateAccessLevelInput = z.infer<typeof updateAccessLevelSchema>;

export function isTimeScheduleTemplateId(
  value: unknown,
): value is TimeScheduleTemplateId {
  return timeScheduleTemplateIdSchema.safeParse(value).success;
}

export function isTapQuotaMode(value: unknown): value is TapQuotaMode {
  return tapQuotaModeSchema.safeParse(value).success;
}

/**
 * Validates a TapQuotaConfig input. Backward-compatible wrapper delegating to tapQuotaSchema.
 */
export function validateTapQuota(
  raw: unknown,
): { valid: true; quota: TapQuotaConfig } | ValidationFailure {
  if (!isRecord(raw)) {
    return { valid: false, errors: { _global: "Tap quota must be an object." } };
  }
  const result = tapQuotaSchema.safeParse(raw);
  if (result.success) {
    return {
      valid: true,
      quota: {
        mode: result.data.mode,
        maxTaps: result.data.mode === "unlimited" ? 0 : result.data.maxTaps ?? 0,
      },
    };
  }
  return { valid: false, errors: formatZodErrors(result.error) };
}

/**
 * Validates payload for creating an Access Level. Backward-compatible wrapper.
 */
export function validateAccessLevelInput(
  raw: unknown,
): ValidationOutcome<CreateAccessLevelInput> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  // Pre-normalize isDefault boolean coercion if needed
  const normalized = {
    ...raw,
    isDefault: raw.isDefault !== undefined ? Boolean(raw.isDefault) : false,
  };

  const result = createAccessLevelSchema.safeParse(normalized);
  if (result.success) {
    return { valid: true, input: result.data };
  }
  return { valid: false, errors: formatZodErrors(result.error) };
}

/**
 * Validates payload for updating an Access Level. Backward-compatible wrapper.
 */
export function validateUpdateAccessLevelInput(
  raw: unknown,
): ValidationOutcome<UpdateAccessLevelInput> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const normalized = {
    ...raw,
    isDefault: raw.isDefault !== undefined ? Boolean(raw.isDefault) : undefined,
  };

  const result = updateAccessLevelSchema.safeParse(normalized);
  if (result.success) {
    return { valid: true, input: result.data };
  }
  return { valid: false, errors: formatZodErrors(result.error) };
}
