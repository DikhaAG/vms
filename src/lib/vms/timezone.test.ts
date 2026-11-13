import { describe, expect, it } from "vitest";
import {
  formatFacilityIso,
  formatInFacilityTimezone,
  isValidIanaTimezone,
  parseLocalDateTimeToUtc,
} from "./timezone";

describe("timezone utilities", () => {
  describe("isValidIanaTimezone", () => {
    it("accepts valid IANA timezones", () => {
      expect(isValidIanaTimezone("Asia/Jakarta")).toBe(true);
      expect(isValidIanaTimezone("Asia/Makassar")).toBe(true);
      expect(isValidIanaTimezone("Asia/Jayapura")).toBe(true);
      expect(isValidIanaTimezone("UTC")).toBe(true);
      expect(isValidIanaTimezone("America/New_York")).toBe(true);
    });

    it("rejects invalid or malformed timezones", () => {
      expect(isValidIanaTimezone("")).toBe(false);
      expect(isValidIanaTimezone("Invalid/Zone")).toBe(false);
      expect(isValidIanaTimezone("WIB")).toBe(false); // 3-letter abbreviation is not canonical IANA
      expect(isValidIanaTimezone("GMT+7")).toBe(false);
    });
  });

  describe("formatFacilityIso", () => {
    it("formats UTC date into facility-specific ISO 8601 string with exact offset", () => {
      // 2026-11-13T09:00:00Z in Asia/Jakarta (UTC+7) -> 2026-11-13T16:00:00+07:00
      const utcDate = new Date("2026-11-13T09:00:00.000Z");
      const jakartaIso = formatFacilityIso(utcDate, "Asia/Jakarta");
      expect(jakartaIso).toBe("2026-11-13T16:00:00+07:00");
      expect(jakartaIso.length).toBeLessThanOrEqual(64);

      // In Asia/Makassar (UTC+8) -> 2026-11-13T17:00:00+08:00
      const makassarIso = formatFacilityIso(utcDate, "Asia/Makassar");
      expect(makassarIso).toBe("2026-11-13T17:00:00+08:00");

      // In Asia/Jayapura (UTC+9) -> 2026-11-13T18:00:00+09:00
      const jayapuraIso = formatFacilityIso(utcDate, "Asia/Jayapura");
      expect(jayapuraIso).toBe("2026-11-13T18:00:00+09:00");
    });

    it("formats UTC date in America/New_York accounting for standard time vs daylight saving time", () => {
      // Winter (EST, UTC-5)
      const winterDate = new Date("2026-01-15T17:00:00.000Z");
      expect(formatFacilityIso(winterDate, "America/New_York")).toBe(
        "2026-01-15T12:00:00-05:00",
      );

      // Summer (EDT, UTC-4)
      const summerDate = new Date("2026-06-15T16:00:00.000Z");
      expect(formatFacilityIso(summerDate, "America/New_York")).toBe(
        "2026-06-15T12:00:00-04:00",
      );
    });

    it("throws on invalid timezone or invalid date", () => {
      expect(() =>
        formatFacilityIso(new Date("invalid"), "Asia/Jakarta"),
      ).toThrow("Invalid date");
      expect(() =>
        formatFacilityIso(new Date(), "Invalid/Timezone"),
      ).toThrow("Invalid IANA timezone");
    });
  });

  describe("parseLocalDateTimeToUtc", () => {
    it("parses local ISO datetime without offset into UTC Date using facility timezone", () => {
      const jakartaUtc = parseLocalDateTimeToUtc(
        "2026-11-13T16:00:00",
        "Asia/Jakarta",
      );
      expect(jakartaUtc.toISOString()).toBe("2026-11-13T09:00:00.000Z");

      const makassarUtc = parseLocalDateTimeToUtc(
        "2026-11-13T17:00:00",
        "Asia/Makassar",
      );
      expect(makassarUtc.toISOString()).toBe("2026-11-13T09:00:00.000Z");

      const jayapuraUtc = parseLocalDateTimeToUtc(
        "2026-11-13T18:00:00",
        "Asia/Jayapura",
      );
      expect(jayapuraUtc.toISOString()).toBe("2026-11-13T09:00:00.000Z");
    });

    it("handles datetime with minute resolution (e.g. from datetime-local input)", () => {
      const parsed = parseLocalDateTimeToUtc(
        "2026-11-13T14:30",
        "Asia/Jakarta",
      );
      expect(parsed.toISOString()).toBe("2026-11-13T07:30:00.000Z");
    });

    it("parses strings that already include an offset or Z directly", () => {
      const withZ = parseLocalDateTimeToUtc(
        "2026-11-13T09:00:00Z",
        "Asia/Jakarta",
      );
      expect(withZ.toISOString()).toBe("2026-11-13T09:00:00.000Z");

      const withOffset = parseLocalDateTimeToUtc(
        "2026-11-13T16:00:00+07:00",
        "America/New_York",
      );
      expect(withOffset.toISOString()).toBe("2026-11-13T09:00:00.000Z");
    });

    it("throws on invalid datetime string", () => {
      expect(() =>
        parseLocalDateTimeToUtc("not-a-date", "Asia/Jakarta"),
      ).toThrow("Invalid date string");
    });
  });

  describe("formatInFacilityTimezone", () => {
    it("formats a Date into a human-readable display string with timezone", () => {
      const d = new Date("2026-11-13T09:00:00.000Z");
      const formatted = formatInFacilityTimezone(d, "Asia/Jakarta");
      expect(formatted).toContain("2026");
      expect(formatted).toContain("16:00");
    });
  });
});
