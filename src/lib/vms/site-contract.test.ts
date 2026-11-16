import { describe, expect, it } from "vitest";
import { siteFromSettings, siteSchema } from "./site-contract";
import { DEFAULT_SYSTEM_SETTINGS } from "./vms-contract";

describe("site-contract", () => {
  it("derives the single Site from System Settings", () => {
    const site = siteFromSettings({
      siteName: "Menara Kinpaku",
      timezone: "Asia/Makassar",
    });
    expect(site).toEqual({ name: "Menara Kinpaku", timezone: "Asia/Makassar" });
  });

  it("derives the default Site from the default System Settings", () => {
    expect(siteFromSettings(DEFAULT_SYSTEM_SETTINGS)).toEqual({
      name: "Gedung Utama",
      timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
    });
  });

  it("strips legacy facility fields (id, address) from a Site payload", () => {
    const parsed = siteSchema.parse({
      id: "fac-jakarta",
      name: "Gedung Utama",
      address: "Jl. Jenderal Sudirman No. 1",
      timezone: "Asia/Jakarta",
    });
    expect(parsed).toEqual({ name: "Gedung Utama", timezone: "Asia/Jakarta" });
  });
});
