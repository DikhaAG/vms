import { describe, it, expect } from "vitest";
import {
  defaultSystemSettings,
  resolveFallbackTimezone,
} from "./system-settings-defaults";

describe("resolveFallbackTimezone", () => {
  it("uses APP_TIMEZONE when it is a valid IANA zone", () => {
    expect(resolveFallbackTimezone({ APP_TIMEZONE: "Asia/Makassar" })).toBe(
      "Asia/Makassar",
    );
  });

  it("falls back to Asia/Jakarta when APP_TIMEZONE is unset or blank", () => {
    expect(resolveFallbackTimezone({})).toBe("Asia/Jakarta");
    expect(resolveFallbackTimezone({ APP_TIMEZONE: "  " })).toBe("Asia/Jakarta");
  });

  it("ignores an APP_TIMEZONE that is not a valid IANA zone", () => {
    expect(resolveFallbackTimezone({ APP_TIMEZONE: "Mars/Olympus" })).toBe(
      "Asia/Jakarta",
    );
  });
});

describe("defaultSystemSettings", () => {
  it("builds the singleton defaults with the env-resolved timezone", () => {
    const settings = defaultSystemSettings({ APP_TIMEZONE: "Asia/Jayapura" });
    expect(settings).toMatchObject({
      id: "default",
      siteName: "Gedung Utama",
      timezone: "Asia/Jayapura",
      overstayGraceMinutes: 15,
      autoCheckInEarlyBufferMinutes: 15,
    });
    expect(typeof settings.updatedAt).toBe("string");
  });
});
