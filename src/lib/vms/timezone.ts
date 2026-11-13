/**
 * Timezone utilities for translating between UTC storage and facility-specific IANA timezones.
 * Supported by native Intl API, compatible with server and browser runtimes.
 */

/**
 * Validates whether the given string is a valid IANA timezone name.
 */
export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

function requireValidTimezone(timeZone: string): void {
  if (!isValidIanaTimezone(timeZone)) {
    throw new Error(`Invalid IANA timezone: "${timeZone}"`);
  }
}

function toValidDate(input: Date | string): Date {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: "${input}"`);
  }
  return date;
}

/**
 * Formats a Date or UTC string into a facility-specific ISO 8601 offset string
 * (e.g. `2026-11-13T16:00:00+07:00`) matching HikCentral OpenAPI requirements.
 * Max length is guaranteed <= 64 characters.
 */
export function formatFacilityIso(
  dateInput: Date | string,
  timeZone: string,
): string {
  const date = toValidDate(dateInput);
  requireValidTimezone(timeZone);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );

  let offset = (parts.timeZoneName || "").replace(/^(GMT|UTC)/, "");
  if (!offset) {
    offset = "+00:00";
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

function getTzOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );

  const tzAsUtc = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    ),
  );

  return (tzAsUtc.getTime() - date.getTime()) / 60000;
}

/**
 * Parses a local datetime string (such as HTML5 datetime-local `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`)
 * in the context of the facility's IANA timezone into a UTC Date.
 * If the string already has an offset or `Z`, it is parsed directly.
 */
export function parseLocalDateTimeToUtc(
  localStr: string,
  timeZone: string,
): Date {
  requireValidTimezone(timeZone);
  const trimmed = localStr.trim();

  // If already offset-qualified or UTC (ends in Z or +/-HH(:mm)?)
  if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(trimmed)) {
    const directDate = new Date(trimmed);
    if (isNaN(directDate.getTime())) {
      throw new Error(`Invalid date string: "${localStr}"`);
    }
    return directDate;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    trimmed,
  );
  if (!match) {
    throw new Error(`Invalid date string: "${localStr}"`);
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const targetUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  // Compute offset and refine for Daylight Saving Time boundaries
  let estimatedUtcMs = targetUtcMs;
  let offsetMinutes = getTzOffsetMinutes(new Date(estimatedUtcMs), timeZone);
  estimatedUtcMs = targetUtcMs - offsetMinutes * 60000;
  offsetMinutes = getTzOffsetMinutes(new Date(estimatedUtcMs), timeZone);

  return new Date(targetUtcMs - offsetMinutes * 60000);
}

/**
 * Formats a Date into a human-readable string in the facility's timezone.
 */
export function formatInFacilityTimezone(
  dateInput: Date | string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toValidDate(dateInput);
  requireValidTimezone(timeZone);

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
    ...options,
  }).format(date);
}
