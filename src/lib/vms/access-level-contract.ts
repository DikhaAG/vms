/**
 * Isomorphic contracts, interfaces, and pure validators for Dynamic Access Level Management
 * (Door/Floor Bundling & Tap Quota).
 * Safe for Client Components (zero Node.js dependencies, zero process.env reads).
 */

export const TIME_SCHEDULE_TEMPLATES = [1, 2, 3] as const;
export type TimeScheduleTemplateId = (typeof TIME_SCHEDULE_TEMPLATES)[number];

export const TIME_SCHEDULE_LABELS: Record<TimeScheduleTemplateId, string> = {
  1: "All-Day Template (24/7)",
  2: "Workday Template (Mon-Fri 08:00-18:00)",
  3: "Holiday / Weekend Template",
};

export const TAP_QUOTA_MODES = ["unlimited", "limited"] as const;
export type TapQuotaMode = (typeof TAP_QUOTA_MODES)[number];

export interface TapQuotaConfig {
  mode: TapQuotaMode;
  maxTaps?: number; // 0 for unlimited, 1-1000 for limited
}

export interface AccessLevel {
  id: string;
  facilityId: string;
  name: string;
  description: string;
  doors: string[];
  floors?: string[];
  timeScheduleId: TimeScheduleTemplateId;
  isDefault: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface CreateAccessLevelInput {
  facilityId: string;
  name: string;
  description?: string;
  doors: string[];
  floors?: string[];
  timeScheduleId: TimeScheduleTemplateId;
  isDefault?: boolean;
}

export interface UpdateAccessLevelInput {
  facilityId?: string;
  name?: string;
  description?: string;
  doors?: string[];
  floors?: string[];
  timeScheduleId?: TimeScheduleTemplateId;
  isDefault?: boolean;
}

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

export function isTimeScheduleTemplateId(
  value: unknown,
): value is TimeScheduleTemplateId {
  return (
    typeof value === "number" &&
    (TIME_SCHEDULE_TEMPLATES as readonly number[]).includes(value)
  );
}

export function isTapQuotaMode(value: unknown): value is TapQuotaMode {
  return (
    typeof value === "string" &&
    (TAP_QUOTA_MODES as readonly string[]).includes(value)
  );
}

/**
 * Validates a TapQuotaConfig input.
 */
export function validateTapQuota(
  raw: unknown,
): { valid: true; quota: TapQuotaConfig } | ValidationFailure {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: { _global: "Tap quota must be an object." } };
  }

  const record = raw as Record<string, unknown>;

  if (!isTapQuotaMode(record.mode)) {
    errors.mode = `Tap quota mode must be one of: ${TAP_QUOTA_MODES.join(", ")}.`;
    return { valid: false, errors };
  }

  const mode = record.mode;
  let maxTaps: number | undefined;

  if (mode === "unlimited") {
    maxTaps = 0;
  } else if (mode === "limited") {
    if (record.maxTaps === undefined || record.maxTaps === null) {
      errors.maxTaps = "Exact tap limit (maxTaps) is required for limited mode.";
    } else if (
      typeof record.maxTaps !== "number" ||
      !Number.isInteger(record.maxTaps) ||
      record.maxTaps < 1 ||
      record.maxTaps > 1000
    ) {
      errors.maxTaps = "Max taps must be an integer between 1 and 1000.";
    } else {
      maxTaps = record.maxTaps;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    quota: {
      mode,
      maxTaps: maxTaps ?? 0,
    },
  };
}

/**
 * Validates payload for creating an Access Level.
 */
export function validateAccessLevelInput(
  raw: unknown,
): ValidationOutcome<CreateAccessLevelInput> {
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

  // Name
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) {
    errors.name = "Access level name is required.";
  } else if (name.length > 32) {
    errors.name = "Access level name must be at most 32 characters.";
  } else if (FORBIDDEN_ACCESS_LEVEL_CHARS.test(name)) {
    errors.name =
      "Access level name cannot contain special characters like ' / \\ : * ? \" < > |";
  }

  // Description (optional)
  let description: string | undefined;
  if (record.description !== undefined && record.description !== null) {
    if (typeof record.description === "string") {
      description = record.description.trim();
      if (description.length > 128) {
        errors.description = "Description must be at most 128 characters.";
      }
    } else {
      errors.description = "Description must be a string.";
    }
  }

  // Doors (must have at least 1 door)
  let doors: string[] = [];
  if (!Array.isArray(record.doors) || record.doors.length === 0) {
    errors.doors = "At least one door must be assigned to the access level.";
  } else {
    doors = record.doors
      .map((d) => (typeof d === "string" ? d.trim() : ""))
      .filter(Boolean);
    if (doors.length === 0) {
      errors.doors = "At least one non-empty door must be assigned.";
    }
  }

  // Floors (optional)
  let floors: string[] | undefined;
  if (record.floors !== undefined && record.floors !== null) {
    if (Array.isArray(record.floors)) {
      floors = record.floors
        .map((f) => (typeof f === "string" ? f.trim() : ""))
        .filter(Boolean);
    } else {
      errors.floors = "Floors must be an array of strings.";
    }
  }

  // Time Schedule
  let timeScheduleId: TimeScheduleTemplateId = 2;
  if (
    record.timeScheduleId !== undefined &&
    record.timeScheduleId !== null
  ) {
    if (isTimeScheduleTemplateId(record.timeScheduleId)) {
      timeScheduleId = record.timeScheduleId;
    } else {
      errors.timeScheduleId = `Time schedule must be one of: ${TIME_SCHEDULE_TEMPLATES.join(", ")}.`;
    }
  } else {
    errors.timeScheduleId = "Time schedule is required.";
  }

  // isDefault
  const isDefault = Boolean(record.isDefault);

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input: {
      facilityId,
      name,
      description: description ?? "",
      doors,
      floors,
      timeScheduleId,
      isDefault,
    },
  };
}

/**
 * Validates payload for updating an Access Level.
 */
export function validateUpdateAccessLevelInput(
  raw: unknown,
): ValidationOutcome<UpdateAccessLevelInput> {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const record = raw as Record<string, unknown>;
  const input: UpdateAccessLevelInput = {};

  if (record.facilityId !== undefined) {
    if (typeof record.facilityId === "string" && record.facilityId.trim()) {
      input.facilityId = record.facilityId.trim();
    } else {
      errors.facilityId = "Facility ID cannot be empty.";
    }
  }

  if (record.name !== undefined) {
    if (typeof record.name === "string" && record.name.trim()) {
      const trimmed = record.name.trim();
      if (trimmed.length > 32) {
        errors.name = "Access level name must be at most 32 characters.";
      } else if (FORBIDDEN_ACCESS_LEVEL_CHARS.test(trimmed)) {
        errors.name =
          "Access level name cannot contain special characters like ' / \\ : * ? \" < > |";
      } else {
        input.name = trimmed;
      }
    } else {
      errors.name = "Access level name cannot be empty.";
    }
  }

  if (record.description !== undefined) {
    if (typeof record.description === "string") {
      const desc = record.description.trim();
      if (desc.length > 128) {
        errors.description = "Description must be at most 128 characters.";
      } else {
        input.description = desc;
      }
    } else {
      errors.description = "Description must be a string.";
    }
  }

  if (record.doors !== undefined) {
    if (Array.isArray(record.doors) && record.doors.length > 0) {
      const doors = record.doors
        .map((d) => (typeof d === "string" ? d.trim() : ""))
        .filter(Boolean);
      if (doors.length === 0) {
        errors.doors = "At least one non-empty door must be assigned.";
      } else {
        input.doors = doors;
      }
    } else {
      errors.doors = "Doors must be a non-empty array of strings.";
    }
  }

  if (record.floors !== undefined) {
    if (Array.isArray(record.floors)) {
      input.floors = record.floors
        .map((f) => (typeof f === "string" ? f.trim() : ""))
        .filter(Boolean);
    } else {
      errors.floors = "Floors must be an array of strings.";
    }
  }

  if (record.timeScheduleId !== undefined) {
    if (isTimeScheduleTemplateId(record.timeScheduleId)) {
      input.timeScheduleId = record.timeScheduleId;
    } else {
      errors.timeScheduleId = `Time schedule must be one of: ${TIME_SCHEDULE_TEMPLATES.join(", ")}.`;
    }
  }

  if (record.isDefault !== undefined) {
    input.isDefault = Boolean(record.isDefault);
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input,
  };
}
