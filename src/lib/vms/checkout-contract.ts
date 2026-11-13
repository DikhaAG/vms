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

export const DOOR_DIRECTIONS = ["in", "out"] as const;
export type DoorDirection = (typeof DOOR_DIRECTIONS)[number];

export function isDoorDirection(value: unknown): value is DoorDirection {
  return (
    typeof value === "string" &&
    (DOOR_DIRECTIONS as readonly string[]).includes(value)
  );
}

export const DOOR_ACCESS_TYPES = [
  "DUAL_DIRECTION",
  "SINGLE_DIRECTION_IN",
] as const;
export type DoorAccessType = (typeof DOOR_ACCESS_TYPES)[number];

export function isDoorAccessType(value: unknown): value is DoorAccessType {
  return (
    typeof value === "string" &&
    (DOOR_ACCESS_TYPES as readonly string[]).includes(value)
  );
}

export interface FacilityDoor {
  id?: string;
  facilityId: string;
  doorIndexCode: string;
  doorName: string;
  accessType: DoorAccessType;
  isPerimeter: boolean;
  roomTimeoutMinutes?: number;
}

export interface VisitLastSeenDoor {
  doorIndexCode: string;
  doorName?: string;
  tappedAtUtc: string;
  direction: DoorDirection;
  accessType?: DoorAccessType;
  isPerimeter?: boolean;
}

export interface DoorTapEvent {
  id?: string;
  visitId: string;
  doorIndexCode: string;
  doorName?: string;
  tappedAtUtc: string;
  direction: DoorDirection;
  inAndOutType?: number;
  isPerimeter?: boolean;
  isImplicit?: boolean;
  implicit?: boolean;
  transitionNote?: string;
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

export const EMERGENCY_GRANT_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
] as const;
export type EmergencyGrantStatus = (typeof EMERGENCY_GRANT_STATUSES)[number];

export function isEmergencyGrantStatus(
  value: unknown,
): value is EmergencyGrantStatus {
  return (
    typeof value === "string" &&
    (EMERGENCY_GRANT_STATUSES as readonly string[]).includes(value)
  );
}

export interface EmergencyAccessGrant {
  id: string;
  visitId: string;
  doorIndexCodes: string[];
  doorNames: string[];
  grantedByUserId: string;
  grantedByName: string;
  reason: string;
  grantedAtUtc: string;
  expiresAtUtc: string;
  status: EmergencyGrantStatus;
  revokedAtUtc?: string;
  revokedByUserId?: string;
  revokedByName?: string;
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
  emergencyGrants?: EmergencyAccessGrant[];
  lastSeenDoor?: VisitLastSeenDoor;
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
 * Pure validator for FacilityDoor input.
 */
export function validateFacilityDoorInput(raw: unknown): ValidationResult<FacilityDoor> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "Door configuration must be an object." } };
  }

  const rec = raw as Record<string, unknown>;

  if (typeof rec.facilityId !== "string" || !rec.facilityId.trim()) {
    errors.facilityId = "Facility ID is required.";
  }

  if (typeof rec.doorIndexCode !== "string" || !rec.doorIndexCode.trim()) {
    errors.doorIndexCode = "Door index code is required.";
  }

  if (typeof rec.doorName !== "string" || !rec.doorName.trim()) {
    errors.doorName = "Door name is required.";
  }

  let accessType: DoorAccessType = "DUAL_DIRECTION";
  if (rec.accessType !== undefined) {
    if (!isDoorAccessType(rec.accessType)) {
      errors.accessType = "Access type must be 'DUAL_DIRECTION' or 'SINGLE_DIRECTION_IN'.";
    } else {
      accessType = rec.accessType;
    }
  }

  const isPerimeter = Boolean(rec.isPerimeter);

  let roomTimeoutMinutes: number | undefined;
  if (rec.roomTimeoutMinutes !== undefined) {
    if (typeof rec.roomTimeoutMinutes === "number" && rec.roomTimeoutMinutes > 0) {
      roomTimeoutMinutes = rec.roomTimeoutMinutes;
    } else {
      errors.roomTimeoutMinutes = "Room timeout must be a positive number of minutes.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  const id =
    typeof rec.id === "string" && rec.id.trim()
      ? rec.id.trim()
      : `door-${(rec.doorIndexCode as string).trim()}`;

  return {
    valid: true,
    input: {
      id,
      facilityId: (rec.facilityId as string).trim(),
      doorIndexCode: (rec.doorIndexCode as string).trim(),
      doorName: (rec.doorName as string).trim(),
      accessType,
      isPerimeter,
      roomTimeoutMinutes,
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

  let direction: DoorDirection = "in";
  let hasExplicitDirection = false;
  if (rec.direction !== undefined) {
    if (!isDoorDirection(rec.direction)) {
      errors.direction = "Direction must be 'in' or 'out'.";
    } else {
      direction = rec.direction;
      hasExplicitDirection = true;
    }
  }

  let inAndOutType: number | undefined;
  if (rec.inAndOutType !== undefined) {
    if (rec.inAndOutType !== 1 && rec.inAndOutType !== 2) {
      errors.inAndOutType = "inAndOutType must be 1 (entry) or 2 (exit).";
    } else {
      inAndOutType = rec.inAndOutType as number;
      if (hasExplicitDirection) {
        if (
          (direction === "in" && inAndOutType !== 1) ||
          (direction === "out" && inAndOutType !== 2)
        ) {
          errors.inAndOutType = `inAndOutType (${inAndOutType}) does not match direction '${direction}'.`;
        }
      } else {
        direction = inAndOutType === 1 ? "in" : "out";
      }
    }
  } else {
    inAndOutType = direction === "in" ? 1 : 2;
  }

  const isPerimeter =
    typeof rec.isPerimeter === "boolean" ? rec.isPerimeter : undefined;
  const isImplicit =
    typeof rec.isImplicit === "boolean"
      ? rec.isImplicit
      : typeof rec.implicit === "boolean"
        ? rec.implicit
        : undefined;
  const implicit = isImplicit;
  const transitionNote =
    typeof rec.transitionNote === "string" ? rec.transitionNote.trim() : undefined;

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
      inAndOutType,
      isPerimeter,
      isImplicit,
      implicit,
      transitionNote,
    },
  };
}

/**
 * Pure evaluation function checking if an emergency access grant is actively valid.
 */
export function isEmergencyGrantActive(
  grant: EmergencyAccessGrant,
  nowUtc?: string | Date,
): boolean {
  if (grant.status !== "ACTIVE") {
    return false;
  }
  const now = nowUtc instanceof Date ? nowUtc : nowUtc ? new Date(nowUtc) : new Date();
  const expiresAt = new Date(grant.expiresAtUtc);
  return now.getTime() < expiresAt.getTime();
}

export interface GrantEmergencyAccessInput {
  visitId?: string;
  doorIndexCodes: string[];
  doorNames?: string[];
  grantedByUserId: string;
  grantedByName?: string;
  reason: string;
  grantedAtUtc?: string;
  expiresAtUtc?: string;
  durationHours?: number;
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
}

/**
 * Pure validator for GrantEmergencyAccessInput.
 */
export function validateGrantEmergencyAccessInput(
  raw: unknown,
): ValidationResult<GrantEmergencyAccessInput> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Emergency access input must be an object." },
    };
  }

  const rec = raw as Record<string, unknown>;

  // Door resolution: accept doorIndexCodes array or single doorIndexCode
  let doorIndexCodes: string[] = [];
  if (Array.isArray(rec.doorIndexCodes)) {
    doorIndexCodes = rec.doorIndexCodes
      .filter((d): d is string => typeof d === "string" && Boolean(d.trim()))
      .map((d) => d.trim());
  } else if (typeof rec.doorIndexCode === "string" && rec.doorIndexCode.trim()) {
    doorIndexCodes = [rec.doorIndexCode.trim()];
  }

  if (doorIndexCodes.length === 0) {
    errors.doorIndexCodes = "At least one door code is required.";
  }

  let doorNames: string[] | undefined;
  if (Array.isArray(rec.doorNames)) {
    doorNames = rec.doorNames
      .filter((n): n is string => typeof n === "string" && Boolean(n.trim()))
      .map((n) => n.trim());
  } else if (typeof rec.doorName === "string" && rec.doorName.trim()) {
    doorNames = [rec.doorName.trim()];
  }

  if (typeof rec.grantedByUserId !== "string" || !rec.grantedByUserId.trim()) {
    errors.grantedByUserId = "Authorizing operator user ID is required.";
  }

  const grantedByName =
    typeof rec.grantedByName === "string" ? rec.grantedByName.trim() : undefined;

  const reason = typeof rec.reason === "string" ? rec.reason.trim() : "";
  if (!reason || reason.length < 10) {
    errors.reason = "A business justification reason of at least 10 characters is required.";
  }

  // Base timestamp for duration calculations
  const grantedAtUtc =
    typeof rec.grantedAtUtc === "string" && rec.grantedAtUtc.trim()
      ? rec.grantedAtUtc.trim()
      : new Date().toISOString();
  const baseTime = new Date(grantedAtUtc);

  let calculatedExpiresAtUtc: string | undefined;

  if (typeof rec.expiresAtUtc === "string" && rec.expiresAtUtc.trim()) {
    const parsedExpiresAt = new Date(rec.expiresAtUtc.trim());
    if (isNaN(parsedExpiresAt.getTime())) {
      errors.expiresAtUtc = "Invalid expiration timestamp format.";
    } else if (parsedExpiresAt.getTime() <= baseTime.getTime()) {
      errors.expiresAtUtc = "Expiration must be in the future.";
    } else {
      calculatedExpiresAtUtc = parsedExpiresAt.toISOString();
    }
  } else if (rec.durationHours !== undefined) {
    const durationHours =
      typeof rec.durationHours === "number" ? rec.durationHours : Number(rec.durationHours);
    if (isNaN(durationHours) || durationHours <= 0) {
      errors.durationHours = "Duration must be a positive number of hours.";
    } else {
      calculatedExpiresAtUtc = new Date(
        baseTime.getTime() + durationHours * 3600 * 1000,
      ).toISOString();
    }
  } else {
    errors.expiresAtUtc =
      "Valid expiration timestamp (expiresAtUtc) or duration in hours (durationHours) is required.";
  }

  if (Object.keys(errors).length > 0 || !calculatedExpiresAtUtc) {
    return { valid: false, errors };
  }

  const visitId =
    typeof rec.visitId === "string" && rec.visitId.trim()
      ? rec.visitId.trim()
      : undefined;

  return {
    valid: true,
    input: {
      visitId,
      doorIndexCodes,
      doorNames,
      grantedByUserId: (rec.grantedByUserId as string).trim(),
      grantedByName,
      reason,
      grantedAtUtc,
      expiresAtUtc: calculatedExpiresAtUtc,
      durationHours:
        typeof rec.durationHours === "number" ? rec.durationHours : undefined,
      mode: rec.mode === "stub" ? "stub" : "live",
      stubScenario: isStubScenario(rec.stubScenario) ? rec.stubScenario : undefined,
    },
  };
}
