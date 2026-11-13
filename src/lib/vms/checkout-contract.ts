/**
 * Isomorphic contracts, interfaces, and pure validators for Active Visit Monitoring,
 * Door Tap Quota Enforcement, Overstay Alert & Check-out.
 * Safe for Client Components (zero Node.js dependencies, zero process.env reads).
 */

import {
  isStubScenario,
  type PreRegistrationMode,
  type StubScenario,
  type VisitStatus,
} from "./vms-contract";
import type { TapQuotaConfig } from "./access-level-contract";

export type DoorDirection = "in" | "out";

export interface DoorTapEvent {
  id?: string;
  visitId: string;
  doorIndexCode: string;
  doorName?: string;
  tappedAtUtc: string;
  direction: DoorDirection;
}

export interface CheckOutInput {
  visitId: string;
  operatorUserId: string;
  operatorName?: string;
  checkOutTimeUtc?: string;
  reason?: string;
  isForced: boolean;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

export interface CheckOutAuditEvent {
  id: string;
  visitId: string;
  checkedOutAtUtc: string;
  operatorUserId: string;
  operatorName?: string;
  reason?: string;
  isForced: boolean;
  appointRecordIdRevoked?: string;
}

export interface ActiveVisitSummary {
  visitId: string;
  groupId?: string;
  visitorGroupName?: string;
  visitor: {
    givenName: string;
    familyName: string;
    fullName: string;
    phone?: string;
    email?: string;
    certificateNo?: string;
    photo?: string;
  };
  host?: {
    id?: string;
    name?: string;
  };
  facility: {
    id: string;
    name: string;
    timezone: string;
  };
  visitReason: string;
  checkInTimeUtc: string;
  scheduledStartTimeUtc: string;
  scheduledEndTimeUtc: string;
  tapCount: number;
  maxTaps: number; // 0 for unlimited
  tapQuotaMode: "unlimited" | "limited";
  isQuotaExceeded: boolean;
  isOverstay: boolean;
  overstayMinutes: number;
  status: VisitStatus;
  appointRecordId?: string;
  accessLevelIds?: string[];
}

export interface OverstayEvaluation {
  isOverstay: boolean;
  overstayMinutes: number;
  scheduledEndTimeUtc: string;
  graceMinutes: number;
  cutoffTimeUtc: string;
}

/**
 * Pure evaluation function for Overstay status.
 * Compares current wall-clock time against scheduledEndTime + overstayGraceMinutes.
 */
export function evaluateOverstayStatus(
  visit: { scheduledEndTimeUtc: string; status?: VisitStatus },
  facility?: { overstayGraceMinutes?: number } | null,
  nowUtc?: string | Date,
): OverstayEvaluation {
  const now = nowUtc instanceof Date ? nowUtc : nowUtc ? new Date(nowUtc) : new Date();
  const scheduledEnd = new Date(visit.scheduledEndTimeUtc);
  const graceMinutes = typeof facility?.overstayGraceMinutes === "number"
    ? facility.overstayGraceMinutes
    : 15;

  const cutoffMs = scheduledEnd.getTime() + graceMinutes * 60 * 1000;
  const nowMs = now.getTime();

  if (nowMs > cutoffMs) {
    const elapsedMinutes = Math.floor((nowMs - scheduledEnd.getTime()) / (60 * 1000));
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

/**
 * Pure evaluation function for Tap Quota enforcement.
 */
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
 * Pure validator for CheckOutInput.
 */
export function validateCheckOutInput(raw: unknown): ValidationResult<CheckOutInput> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "CheckOut input must be an object." } };
  }

  const rec = raw as Record<string, unknown>;

  if (typeof rec.visitId !== "string" || !rec.visitId.trim()) {
    errors.visitId = "Visit ID is required.";
  }

  if (typeof rec.operatorUserId !== "string" || !rec.operatorUserId.trim()) {
    errors.operatorUserId = "Operator user ID is required.";
  }

  const isForced = Boolean(rec.isForced);
  const reason = typeof rec.reason === "string" ? rec.reason.trim() : "";

  if (isForced && !reason) {
    errors.reason = "A reason is required for force check-out.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const checkOutTimeUtc =
    typeof rec.checkOutTimeUtc === "string" && rec.checkOutTimeUtc.trim()
      ? rec.checkOutTimeUtc.trim()
      : new Date().toISOString();

  return {
    valid: true,
    input: {
      visitId: (rec.visitId as string).trim(),
      operatorUserId: (rec.operatorUserId as string).trim(),
      operatorName:
        typeof rec.operatorName === "string" ? rec.operatorName.trim() : undefined,
      checkOutTimeUtc,
      reason: reason || undefined,
      isForced,
      mode: rec.mode === "stub" ? "stub" : "live",
      stubScenario: isStubScenario(rec.stubScenario) ? rec.stubScenario : undefined,
    },
  };
}

/**
 * Pure validator for DoorTapEvent input.
 */
export function validateDoorTapInput(raw: unknown): ValidationResult<DoorTapEvent> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "Door tap input must be an object." } };
  }

  const rec = raw as Record<string, unknown>;

  if (typeof rec.visitId !== "string" || !rec.visitId.trim()) {
    errors.visitId = "Visit ID is required.";
  }

  if (typeof rec.doorIndexCode !== "string" || !rec.doorIndexCode.trim()) {
    errors.doorIndexCode = "Door index code is required.";
  }

  const direction: DoorDirection =
    rec.direction === "out" ? "out" : "in";

  const tappedAtUtc =
    typeof rec.tappedAtUtc === "string" && rec.tappedAtUtc.trim()
      ? rec.tappedAtUtc.trim()
      : new Date().toISOString();

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input: {
      visitId: (rec.visitId as string).trim(),
      doorIndexCode: (rec.doorIndexCode as string).trim(),
      doorName: typeof rec.doorName === "string" ? rec.doorName.trim() : undefined,
      tappedAtUtc,
      direction,
    },
  };
}
