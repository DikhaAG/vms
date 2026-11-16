/**
 * Isomorphic contracts, interfaces, and pure validators for Active Visit Monitoring,
 * Door Tap Quota Enforcement, Overstay Alert & Check-out.
 * Safe for Client Components (zero Node.js dependencies, zero process.env reads).
 */

import { z } from "zod";
import { siteSchema } from "./site-contract";
import { formatZodErrors, isRecord } from "./validation-helpers";
import { preRegistrationModeSchema } from "./pre-registration-mode-contract";
import type { StubScenario, VisitStatus } from "./vms-contract";
import type { TapQuotaConfig } from "./access-level-contract";

export const DOOR_DIRECTIONS = ["in", "out"] as const;
export const doorDirectionSchema = z.enum(DOOR_DIRECTIONS, {
  error: "Direction must be 'in' or 'out'.",
});
export type DoorDirection = z.infer<typeof doorDirectionSchema>;

export function isDoorDirection(value: unknown): value is DoorDirection {
  return doorDirectionSchema.safeParse(value).success;
}

export const DOOR_ACCESS_TYPES = [
  "DUAL_DIRECTION",
  "SINGLE_DIRECTION_IN",
] as const;
export const doorAccessTypeSchema = z.enum(DOOR_ACCESS_TYPES, {
  error: "Access type must be 'DUAL_DIRECTION' or 'SINGLE_DIRECTION_IN'.",
});
export type DoorAccessType = z.infer<typeof doorAccessTypeSchema>;

export function isDoorAccessType(value: unknown): value is DoorAccessType {
  return doorAccessTypeSchema.safeParse(value).success;
}

export const facilityDoorSchema = z.object({
  id: z.string().optional(),
  regionIndexCode: z.string().trim().optional(),
  doorIndexCode: z.string().trim().min(1, "Door index code is required."),
  doorName: z.string().trim().min(1, "Door name is required."),
  channelNo: z.union([z.string(), z.number()]).optional(),
  doorState: z.number().int().optional(),
  doorOutState: z.number().int().optional(),
  acsDevIndexCode: z.string().trim().optional(),
  isOnline: z.boolean().optional(),
  accessType: doorAccessTypeSchema.default("DUAL_DIRECTION"),
  isPerimeter: z.boolean().default(false),
  roomTimeoutMinutes: z
    .number()
    .positive("Room timeout must be a positive number of minutes.")
    .optional(),
});
export type FacilityDoor = z.infer<typeof facilityDoorSchema>;

export const doorSchema = facilityDoorSchema;
export type Door = FacilityDoor;

export const visitLastSeenDoorSchema = z.object({
  doorIndexCode: z.string(),
  doorName: z.string().optional(),
  tappedAtUtc: z.string(),
  direction: doorDirectionSchema,
  accessType: doorAccessTypeSchema.optional(),
  isPerimeter: z.boolean().optional(),
});
export type VisitLastSeenDoor = z.infer<typeof visitLastSeenDoorSchema>;

export const doorTapEventSchema = z
  .object({
    id: z.string().optional(),
    visitId: z
      .string({ error: "Visit ID is required." })
      .trim()
      .min(1, "Visit ID is required."),
    doorIndexCode: z
      .string({ error: "Door index code is required." })
      .trim()
      .min(1, "Door index code is required."),
    doorName: z.string().optional(),
    tappedAtUtc: z.string(),
    direction: doorDirectionSchema,
    inAndOutType: z.number().int().optional(),
    isPerimeter: z.boolean().optional(),
    isImplicit: z.boolean().optional(),
    implicit: z.boolean().optional(),
    transitionNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.inAndOutType !== undefined) {
      if (data.inAndOutType !== 1 && data.inAndOutType !== 2) {
        ctx.addIssue({
          code: "custom",
          path: ["inAndOutType"],
          message: "inAndOutType must be 1 (entry) or 2 (exit).",
        });
      } else if (data.direction) {
        if (
          (data.direction === "in" && data.inAndOutType !== 1) ||
          (data.direction === "out" && data.inAndOutType !== 2)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["inAndOutType"],
            message: `inAndOutType (${data.inAndOutType}) does not match direction '${data.direction}'.`,
          });
        }
      }
    }
  });
export type DoorTapEvent = z.infer<typeof doorTapEventSchema>;

export const hostArrivalNotificationSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  hostId: z.string().optional(),
  hostName: z.string().optional(),
  visitorName: z.string(),
  doorIndexCode: z.string(),
  doorName: z.string().optional(),
  arrivedAtUtc: z.string(),
  message: z.string(),
  createdAtUtc: z.string(),
});
export type HostArrivalNotification = z.infer<typeof hostArrivalNotificationSchema>;

export interface AutoCheckInEvaluation {
  eligible: boolean;
  error?: string;
  earliestAllowedUtc: string;
  bufferMinutes: number;
}

export const checkOutInputSchema = z
  .object({
    visitId: z.string().trim().min(1, "Visit ID is required."),
    operatorUserId: z.string().trim().min(1, "Operator user ID is required."),
    operatorName: z.string().trim().optional(),
    checkOutTimeUtc: z.string().trim().optional(),
    reason: z.string().trim().optional(),
    isForced: z.boolean().default(false),
    mode: preRegistrationModeSchema.optional(),
    stubScenario: z.custom<StubScenario>().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isForced && (!data.reason || !data.reason.trim())) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is required for force check-out.",
      });
    }
  });
export type CheckOutInput = z.infer<typeof checkOutInputSchema>;

export const checkOutAuditEventSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  checkedOutAtUtc: z.string(),
  operatorUserId: z.string(),
  operatorName: z.string().optional(),
  reason: z.string().optional(),
  isForced: z.boolean(),
  appointRecordIdRevoked: z.string().optional(),
});
export type CheckOutAuditEvent = z.infer<typeof checkOutAuditEventSchema>;

export const EMERGENCY_GRANT_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
] as const;
export const emergencyGrantStatusSchema = z.enum(EMERGENCY_GRANT_STATUSES);
export type EmergencyGrantStatus = z.infer<typeof emergencyGrantStatusSchema>;

export function isEmergencyGrantStatus(
  value: unknown,
): value is EmergencyGrantStatus {
  return emergencyGrantStatusSchema.safeParse(value).success;
}

export const emergencyAccessGrantSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  doorIndexCodes: z.array(z.string()),
  doorNames: z.array(z.string()),
  grantedByUserId: z.string(),
  grantedByName: z.string(),
  reason: z.string(),
  grantedAtUtc: z.string(),
  expiresAtUtc: z.string(),
  status: emergencyGrantStatusSchema,
  revokedAtUtc: z.string().optional(),
  revokedByUserId: z.string().optional(),
  revokedByName: z.string().optional(),
});
export type EmergencyAccessGrant = z.infer<typeof emergencyAccessGrantSchema>;

export const grantEmergencyAccessInputSchema = z
  .object({
    visitId: z.string().optional(),
    doorIndexCodes: z
      .array(z.string())
      .min(1, "At least one door code is required."),
    doorNames: z.array(z.string()).optional(),
    grantedByUserId: z
      .string({ error: "Authorizing operator user ID is required." })
      .trim()
      .min(1, "Authorizing operator user ID is required."),
    grantedByName: z.string().optional(),
    reason: z
      .string({ error: "A business justification reason of at least 10 characters is required." })
      .trim()
      .min(
        10,
        "A business justification reason of at least 10 characters is required.",
      ),
    grantedAtUtc: z.string().optional(),
    expiresAtUtc: z.string().optional(),
    durationHours: z.number().optional(),
    mode: preRegistrationModeSchema.optional(),
    stubScenario: z.custom<StubScenario>().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.durationHours !== undefined) {
      if (isNaN(data.durationHours) || data.durationHours <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["durationHours"],
          message: "Duration must be a positive number of hours.",
        });
      }
    }
    const grantedAt = data.grantedAtUtc ? new Date(data.grantedAtUtc) : new Date();
    if (data.expiresAtUtc && data.expiresAtUtc.trim()) {
      const exp = new Date(data.expiresAtUtc.trim());
      if (isNaN(exp.getTime())) {
        ctx.addIssue({
          code: "custom",
          path: ["expiresAtUtc"],
          message: "Invalid expiration timestamp format.",
        });
      } else if (exp.getTime() <= grantedAt.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["expiresAtUtc"],
          message: "Expiration must be in the future.",
        });
      }
    } else if (data.durationHours === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAtUtc"],
        message: "Either expiresAtUtc or durationHours must be specified.",
      });
    }
  });
export type GrantEmergencyAccessInput = z.infer<
  typeof grantEmergencyAccessInputSchema
>;

export const activeVisitSummarySchema = z.object({
  visitId: z.string(),
  groupId: z.string().optional(),
  visitorGroupName: z.string().optional(),
  visitor: z.object({
    givenName: z.string(),
    familyName: z.string(),
    fullName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    certificateNo: z.string().optional(),
    photo: z.string().optional(),
  }),
  host: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
    })
    .optional(),
  site: siteSchema,
  visitReason: z.string(),
  checkInTimeUtc: z.string(),
  scheduledStartTimeUtc: z.string(),
  scheduledEndTimeUtc: z.string(),
  tapCount: z.number(),
  maxTaps: z.number(),
  tapQuotaMode: z.enum(["unlimited", "limited"]),
  isQuotaExceeded: z.boolean(),
  isOverstay: z.boolean(),
  overstayMinutes: z.number(),
  status: z.custom<VisitStatus>(),
  appointRecordId: z.string().optional(),
  accessLevelIds: z.array(z.string()).optional(),
  emergencyGrants: z.array(emergencyAccessGrantSchema).optional(),
  lastSeenDoor: visitLastSeenDoorSchema.optional(),
  isFastTrack: z.boolean().optional(),
  movementBreadcrumbs: z.array(doorTapEventSchema).optional(),
});
export type ActiveVisitSummary = z.infer<typeof activeVisitSummarySchema>;

export interface OverstayEvaluation {
  isOverstay: boolean;
  overstayMinutes: number;
  scheduledEndTimeUtc: string;
  graceMinutes: number;
  cutoffTimeUtc: string;
}

export function evaluateOverstayStatus(
  visit: { scheduledEndTimeUtc: string; status?: VisitStatus },
  settings?: { overstayGraceMinutes?: number } | null,
  nowUtc?: string | Date,
): OverstayEvaluation {
  const now =
    nowUtc instanceof Date ? nowUtc : nowUtc ? new Date(nowUtc) : new Date();
  const scheduledEnd = new Date(visit.scheduledEndTimeUtc);
  const graceMinutes =
    typeof settings?.overstayGraceMinutes === "number"
      ? settings.overstayGraceMinutes
      : 15;

  const cutoffMs = scheduledEnd.getTime() + graceMinutes * 60 * 1000;
  const nowMs = now.getTime();

  if (nowMs > cutoffMs) {
    const elapsedMinutes = Math.floor(
      (nowMs - scheduledEnd.getTime()) / (60 * 1000),
    );
    return {
      isOverstay: true,
      overstayMinutes: Math.max(1, elapsedMinutes),
      scheduledEndTimeUtc: visit.scheduledEndTimeUtc,
      graceMinutes,
      cutoffTimeUtc: new Date(cutoffMs).toISOString(),
    };
  }

  return {
    isOverstay: false,
    overstayMinutes: 0,
    scheduledEndTimeUtc: visit.scheduledEndTimeUtc,
    graceMinutes,
    cutoffTimeUtc: new Date(cutoffMs).toISOString(),
  };
}

export function isTapQuotaExceeded(
  tapCount: number,
  tapQuota?: TapQuotaConfig,
): boolean {
  if (!tapQuota || tapQuota.mode === "unlimited") {
    return false;
  }

  if (
    tapQuota.mode === "limited" &&
    typeof tapQuota.maxTaps === "number" &&
    tapQuota.maxTaps > 0
  ) {
    return tapCount >= tapQuota.maxTaps;
  }

  return false;
}

export function isAutoCheckInEligible(
  visit: { status: VisitStatus },
  door?: { isPerimeter?: boolean } | null,
): boolean {
  return visit.status === "APPROVED" && Boolean(door?.isPerimeter);
}

export function evaluateAutoCheckIn(params: {
  visit: {
    status: VisitStatus;
    scheduledStartTimeUtc: string;
    scheduledEndTimeUtc?: string;
  };
  door?: {
    isPerimeter?: boolean;
    doorName?: string;
    doorIndexCode?: string;
  } | null;
  tappedAtUtc?: string | Date;
  direction?: DoorDirection;
  earlyArrivalBufferMinutes?: number;
}): AutoCheckInEvaluation {
  const bufferMinutes =
    typeof params.earlyArrivalBufferMinutes === "number" &&
    params.earlyArrivalBufferMinutes >= 0
      ? params.earlyArrivalBufferMinutes
      : 15;

  const scheduledStartMs = new Date(
    params.visit.scheduledStartTimeUtc,
  ).getTime();
  const earliestAllowedMs = scheduledStartMs - bufferMinutes * 60 * 1000;
  const earliestAllowedUtc = new Date(earliestAllowedMs).toISOString();

  if (params.visit.status !== "APPROVED") {
    return {
      eligible: false,
      error: `Auto check-in only available for APPROVED visits (current: ${params.visit.status}).`,
      earliestAllowedUtc,
      bufferMinutes,
    };
  }

  const isPerimeter = Boolean(params.door?.isPerimeter);
  if (!isPerimeter) {
    return {
      eligible: false,
      error:
        "Auto check-in only permitted at designated perimeter entry points. Please check in at reception.",
      earliestAllowedUtc,
      bufferMinutes,
    };
  }

  const direction = params.direction ?? "in";
  if (direction !== "in") {
    return {
      eligible: false,
      error: "Auto check-in only permitted for entry taps.",
      earliestAllowedUtc,
      bufferMinutes,
    };
  }

  const tapTime = params.tappedAtUtc
    ? params.tappedAtUtc instanceof Date
      ? params.tappedAtUtc
      : new Date(params.tappedAtUtc)
    : new Date();
  const tapMs = tapTime.getTime();

  if (tapMs < earliestAllowedMs) {
    return {
      eligible: false,
      error: `Too early for auto check-in. Scheduled start is ${params.visit.scheduledStartTimeUtc}. Please wait or proceed to reception.`,
      earliestAllowedUtc,
      bufferMinutes,
    };
  }

  if (params.visit.scheduledEndTimeUtc) {
    const endMs = new Date(params.visit.scheduledEndTimeUtc).getTime();
    if (tapMs > endMs) {
      return {
        eligible: false,
        error: `Visit window has expired. Scheduled end was ${params.visit.scheduledEndTimeUtc}. Please proceed to reception.`,
        earliestAllowedUtc,
        bufferMinutes,
      };
    }
  }

  return {
    eligible: true,
    earliestAllowedUtc,
    bufferMinutes,
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

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Pure validator for CheckOutInput. Backward-compatible wrapper.
 */
export function validateCheckOutInput(
  raw: unknown,
): ValidationResult<CheckOutInput> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "CheckOut input must be an object." },
    };
  }

  const result = checkOutInputSchema.safeParse(raw);
  if (result.success) {
    return {
      valid: true,
      input: {
        visitId: result.data.visitId,
        operatorUserId: result.data.operatorUserId,
        operatorName: result.data.operatorName,
        checkOutTimeUtc:
          result.data.checkOutTimeUtc || new Date().toISOString(),
        reason: result.data.reason || undefined,
        isForced: result.data.isForced,
        mode: result.data.mode,
        stubScenario: result.data.stubScenario as StubScenario | undefined,
      },
    };
  }

  return { valid: false, errors: formatZodErrors(result.error) };
}

/**
 * Pure validator for FacilityDoor input. Backward-compatible wrapper.
 */
export function validateFacilityDoorInput(
  raw: unknown,
): ValidationResult<FacilityDoor> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Door configuration must be an object." },
    };
  }

  const result = facilityDoorSchema.safeParse(raw);
  if (result.success) {
    const id =
      result.data.id && result.data.id.trim()
        ? result.data.id.trim()
        : `door-${result.data.doorIndexCode}`;
    return {
      valid: true,
      input: {
        id,
        regionIndexCode: result.data.regionIndexCode,
        doorIndexCode: result.data.doorIndexCode,
        doorName: result.data.doorName,
        accessType: result.data.accessType,
        isPerimeter: result.data.isPerimeter,
        roomTimeoutMinutes: result.data.roomTimeoutMinutes,
      },
    };
  }

  return { valid: false, errors: formatZodErrors(result.error) };
}

/**
 * Pure validator for DoorTapEvent input. Backward-compatible wrapper.
 */
export function validateDoorTapInput(
  raw: unknown,
): ValidationResult<DoorTapEvent> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Door tap input must be an object." },
    };
  }

  const rec = raw;
  const direction: unknown =
    rec.direction !== undefined
      ? rec.direction
      : rec.inAndOutType === 2
        ? "out"
        : "in";
  const tappedAtUtc: unknown =
    typeof rec.tappedAtUtc === "string" && rec.tappedAtUtc.trim()
      ? rec.tappedAtUtc.trim()
      : new Date().toISOString();

  const normalized = {
    ...rec,
    direction,
    tappedAtUtc,
  };

  const result = doorTapEventSchema.safeParse(normalized);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  const data = result.data;
  const inAndOutType = data.inAndOutType ?? (data.direction === "in" ? 1 : 2);
  const isImplicit = data.isImplicit ?? data.implicit;

  return {
    valid: true,
    input: {
      visitId: data.visitId,
      doorIndexCode: data.doorIndexCode,
      doorName: data.doorName?.trim() || undefined,
      tappedAtUtc: data.tappedAtUtc,
      direction: data.direction,
      inAndOutType,
      isPerimeter: data.isPerimeter,
      isImplicit,
      implicit: isImplicit,
      transitionNote: data.transitionNote?.trim() || undefined,
    },
  };
}

export function isEmergencyGrantActive(
  grant: EmergencyAccessGrant,
  nowUtc?: string | Date,
): boolean {
  if (grant.status !== "ACTIVE") {
    return false;
  }
  const now =
    nowUtc instanceof Date ? nowUtc : nowUtc ? new Date(nowUtc) : new Date();
  const expiresAt = new Date(grant.expiresAtUtc);
  return now.getTime() < expiresAt.getTime();
}

/**
 * Pure validator for GrantEmergencyAccessInput. Backward-compatible wrapper.
 */
export function validateGrantEmergencyAccessInput(
  raw: unknown,
): ValidationResult<GrantEmergencyAccessInput> {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Emergency access input must be an object." },
    };
  }

  const rec = raw;
  let doorIndexCodes: string[] = [];
  if (Array.isArray(rec.doorIndexCodes)) {
    doorIndexCodes = rec.doorIndexCodes
      .filter((d): d is string => typeof d === "string" && Boolean(d.trim()))
      .map((d) => d.trim());
  } else if (
    typeof rec.doorIndexCode === "string" &&
    rec.doorIndexCode.trim()
  ) {
    doorIndexCodes = [rec.doorIndexCode.trim()];
  }

  let doorNames: string[] | undefined;
  if (Array.isArray(rec.doorNames)) {
    doorNames = rec.doorNames
      .filter((n): n is string => typeof n === "string" && Boolean(n.trim()))
      .map((n) => n.trim());
  } else if (typeof rec.doorName === "string" && rec.doorName.trim()) {
    doorNames = [rec.doorName.trim()];
  }

  const normalized = {
    ...rec,
    doorIndexCodes,
    doorNames,
  };

  const result = grantEmergencyAccessInputSchema.safeParse(normalized);
  if (!result.success) {
    return { valid: false, errors: formatZodErrors(result.error) };
  }

  const data = result.data;
  const grantedAtUtc =
    data.grantedAtUtc?.trim() || new Date().toISOString();
  let calculatedExpiresAtUtc = data.expiresAtUtc?.trim();
  if (!calculatedExpiresAtUtc && typeof data.durationHours === "number") {
    calculatedExpiresAtUtc = new Date(
      new Date(grantedAtUtc).getTime() + data.durationHours * 60 * 60 * 1000,
    ).toISOString();
  }

  return {
    valid: true,
    input: {
      visitId: data.visitId,
      doorIndexCodes: data.doorIndexCodes,
      doorNames: data.doorNames,
      grantedByUserId: data.grantedByUserId,
      grantedByName: data.grantedByName?.trim() || undefined,
      reason: data.reason,
      grantedAtUtc,
      expiresAtUtc: calculatedExpiresAtUtc,
      durationHours: data.durationHours,
      mode: data.mode === "stub" ? "stub" : "live",
      stubScenario: data.stubScenario,
    },
  };
}
