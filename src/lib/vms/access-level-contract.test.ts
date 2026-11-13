import { describe, expect, it } from "vitest";
import {
  TIME_SCHEDULE_TEMPLATES,
  TIME_SCHEDULE_LABELS,
  validateTapQuota,
  validateAccessLevelInput,
  validateUpdateAccessLevelInput,
} from "./access-level-contract";

describe("access-level-contract", () => {
  describe("time schedule templates & labels", () => {
    it("defines 1, 2, 3 as standard HikCentral time schedule template IDs", () => {
      expect(TIME_SCHEDULE_TEMPLATES).toEqual([1, 2, 3]);
      expect(TIME_SCHEDULE_LABELS[1]).toContain("All-Day");
      expect(TIME_SCHEDULE_LABELS[2]).toContain("Workday");
      expect(TIME_SCHEDULE_LABELS[3]).toContain("Holiday");
    });
  });

  describe("tap quota validation", () => {
    it("validates unlimited quota successfully", () => {
      const result = validateTapQuota({ mode: "unlimited" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.quota.mode).toBe("unlimited");
        expect(result.quota.maxTaps).toBe(0);
      }
    });

    it("validates limited quota with valid maxTaps (1 to 1000)", () => {
      const result1 = validateTapQuota({ mode: "limited", maxTaps: 1 });
      expect(result1.valid).toBe(true);
      if (result1.valid) {
        expect(result1.quota.mode).toBe("limited");
        expect(result1.quota.maxTaps).toBe(1);
      }

      const result2 = validateTapQuota({ mode: "limited", maxTaps: 1000 });
      expect(result2.valid).toBe(true);
      if (result2.valid) {
        expect(result2.quota.maxTaps).toBe(1000);
      }
    });

    it("rejects invalid tap quota mode", () => {
      const result = validateTapQuota({ mode: "invalid" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.mode).toBeDefined();
      }
    });

    it("rejects limited quota without maxTaps or out of 1-1000 range", () => {
      const noTaps = validateTapQuota({ mode: "limited" });
      expect(noTaps.valid).toBe(false);

      const zeroTaps = validateTapQuota({ mode: "limited", maxTaps: 0 });
      expect(zeroTaps.valid).toBe(false);

      const excessTaps = validateTapQuota({ mode: "limited", maxTaps: 1001 });
      expect(excessTaps.valid).toBe(false);

      const negativeTaps = validateTapQuota({ mode: "limited", maxTaps: -5 });
      expect(negativeTaps.valid).toBe(false);

      const floatTaps = validateTapQuota({ mode: "limited", maxTaps: 2.5 });
      expect(floatTaps.valid).toBe(false);
    });
  });

  describe("access level input validation", () => {
    const validPayload = {
      facilityId: "fac-jakarta",
      name: "Lobby Turnstiles",
      description: "Ground floor main access",
      doors: ["Turnstile A", "Turnstile B"],
      floors: ["1F"],
      timeScheduleId: 2,
      isDefault: true,
    };

    it("validates valid access level input", () => {
      const result = validateAccessLevelInput(validPayload);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.input.name).toBe("Lobby Turnstiles");
        expect(result.input.doors).toEqual(["Turnstile A", "Turnstile B"]);
        expect(result.input.floors).toEqual(["1F"]);
        expect(result.input.timeScheduleId).toBe(2);
        expect(result.input.isDefault).toBe(true);
      }
    });

    it("rejects empty or missing facilityId", () => {
      const result = validateAccessLevelInput({ ...validPayload, facilityId: "" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.facilityId).toBeDefined();
      }
    });

    it("rejects empty name or name > 32 characters", () => {
      const emptyName = validateAccessLevelInput({ ...validPayload, name: "" });
      expect(emptyName.valid).toBe(false);

      const longName = validateAccessLevelInput({
        ...validPayload,
        name: "This name is definitely way longer than 32 characters allowed",
      });
      expect(longName.valid).toBe(false);
    });

    it("rejects names with HikCentral forbidden special characters", () => {
      const badName = validateAccessLevelInput({
        ...validPayload,
        name: "Lobby / Floor <1>",
      });
      expect(badName.valid).toBe(false);
      if (!badName.valid) {
        expect(badName.errors.name).toContain("special characters");
      }
    });

    it("rejects empty doors array", () => {
      const noDoors = validateAccessLevelInput({
        ...validPayload,
        doors: [],
      });
      expect(noDoors.valid).toBe(false);
      if (!noDoors.valid) {
        expect(noDoors.errors.doors).toBeDefined();
      }
    });

    it("rejects invalid timeScheduleId", () => {
      const invalidSchedule = validateAccessLevelInput({
        ...validPayload,
        timeScheduleId: 99,
      });
      expect(invalidSchedule.valid).toBe(false);
      if (!invalidSchedule.valid) {
        expect(invalidSchedule.errors.timeScheduleId).toBeDefined();
      }
    });

    it("validates update input with optional fields", () => {
      const result = validateUpdateAccessLevelInput({
        name: "Updated Name",
        description: "New description",
        doors: ["Door 1"],
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.input.name).toBe("Updated Name");
      }
    });
  });
});
