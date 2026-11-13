import { describe, it, expect } from "vitest";
import {
  DOOR_DIRECTIONS,
  evaluateOverstayStatus,
  isDoorDirection,
  isTapQuotaExceeded,
  validateCheckOutInput,
  validateDoorTapInput,
  type CheckOutInput,
  type DoorTapEvent,
} from "./checkout-contract";
import type { Visit } from "./vms-contract";

describe("checkout-contract", () => {
  describe("DOOR_DIRECTIONS and isDoorDirection", () => {
    it("defines valid tuple and derives runtime guard", () => {
      expect(DOOR_DIRECTIONS).toEqual(["in", "out"]);
      expect(isDoorDirection("in")).toBe(true);
      expect(isDoorDirection("out")).toBe(true);
      expect(isDoorDirection("unknown")).toBe(false);
      expect(isDoorDirection(123)).toBe(false);
      expect(isDoorDirection(null)).toBe(false);
    });
  });

  describe("evaluateOverstayStatus", () => {
    const baseVisit: Visit = {
      id: "vis-101",
      facilityId: "fac-jakarta",
      visitorGivenName: "Alice",
      visitorFamilyName: "Smith",
      visitReasonType: 3,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    const facility = {
      id: "fac-jakarta",
      name: "Jakarta Corporate HQ",
      timezone: "Asia/Jakarta",
      overstayGraceMinutes: 15,
    };

    it("evaluates as NOT overstay when now is before scheduledEndTime", () => {
      const now = new Date("2026-11-13T09:30:00.000Z");
      const result = evaluateOverstayStatus(baseVisit, facility, now);

      expect(result.isOverstay).toBe(false);
      expect(result.overstayMinutes).toBe(0);
      expect(result.graceMinutes).toBe(15);
      expect(result.cutoffTimeUtc).toBe("2026-11-13T10:15:00.000Z");
    });

    it("evaluates as NOT overstay when now is within grace period", () => {
      // Scheduled end is 10:00, grace is 15 min -> cutoff is 10:15
      const now = new Date("2026-11-13T10:10:00.000Z");
      const result = evaluateOverstayStatus(baseVisit, facility, now);

      expect(result.isOverstay).toBe(false);
      expect(result.overstayMinutes).toBe(0);
    });

    it("evaluates as overstay when now is past cutoff time (scheduled end + grace period)", () => {
      // 10:35 is 35 minutes past scheduled end (10:00), past cutoff (10:15)
      const now = new Date("2026-11-13T10:35:00.000Z");
      const result = evaluateOverstayStatus(baseVisit, facility, now);

      expect(result.isOverstay).toBe(true);
      expect(result.overstayMinutes).toBe(35);
      expect(result.cutoffTimeUtc).toBe("2026-11-13T10:15:00.000Z");
    });

    it("uses default 15 minutes grace period if facility has none defined", () => {
      const now = new Date("2026-11-13T10:16:00.000Z");
      const result = evaluateOverstayStatus(baseVisit, null, now);

      expect(result.isOverstay).toBe(true);
      expect(result.graceMinutes).toBe(15);
      expect(result.overstayMinutes).toBe(16);
    });
  });

  describe("isTapQuotaExceeded", () => {
    it("returns false for unlimited quota mode", () => {
      expect(isTapQuotaExceeded(10, { mode: "unlimited" })).toBe(false);
      expect(isTapQuotaExceeded(999, { mode: "unlimited", maxTaps: 0 })).toBe(false);
      expect(isTapQuotaExceeded(5, undefined)).toBe(false);
    });

    it("returns false when tapCount is below limited maxTaps", () => {
      expect(isTapQuotaExceeded(1, { mode: "limited", maxTaps: 2 })).toBe(false);
      expect(isTapQuotaExceeded(0, { mode: "limited", maxTaps: 1 })).toBe(false);
    });

    it("returns true when tapCount equals or exceeds limited maxTaps", () => {
      expect(isTapQuotaExceeded(2, { mode: "limited", maxTaps: 2 })).toBe(true);
      expect(isTapQuotaExceeded(3, { mode: "limited", maxTaps: 2 })).toBe(true);
    });
  });

  describe("validateCheckOutInput", () => {
    it("accepts valid checkout input", () => {
      const valid: CheckOutInput = {
        visitId: "vis-101",
        operatorUserId: "usr-sec-01",
        operatorName: "Officer Budi",
        reason: "Normal visit completion",
        isForced: false,
      };

      const res = validateCheckOutInput(valid);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.input.visitId).toBe("vis-101");
        expect(res.input.isForced).toBe(false);
        expect(res.input.checkOutTimeUtc).toBeDefined();
      }
    });

    it("rejects missing visitId or operatorUserId", () => {
      const res = validateCheckOutInput({
        isForced: false,
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.visitId).toBeDefined();
        expect(res.errors.operatorUserId).toBeDefined();
      }
    });

    it("requires reason when isForced is true", () => {
      const res = validateCheckOutInput({
        visitId: "vis-101",
        operatorUserId: "usr-sec-01",
        isForced: true,
        reason: "",
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.reason).toMatch(/reason is required for force check-out/i);
      }
    });
  });

  describe("validateDoorTapInput", () => {
    it("accepts valid door tap payload", () => {
      const valid: DoorTapEvent = {
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        doorName: "Main Turnstile",
        tappedAtUtc: "2026-11-13T09:00:00.000Z",
        direction: "in",
      };

      const res = validateDoorTapInput(valid);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.input.visitId).toBe("vis-101");
        expect(res.input.doorIndexCode).toBe("door-turnstile-1");
        expect(res.input.direction).toBe("in");
      }
    });

    it("defaults direction to 'in' and tappedAtUtc to now if omitted", () => {
      const res = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.input.direction).toBe("in");
        expect(res.input.tappedAtUtc).toBeDefined();
      }
    });

    it("rejects invalid direction strings rather than silently defaulting", () => {
      const res = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        direction: "sideways",
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.direction).toMatch(/direction must be 'in' or 'out'/i);
      }
    });

    it("rejects invalid doorIndexCode or missing visitId", () => {
      const res = validateDoorTapInput({});
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.visitId).toBeDefined();
        expect(res.errors.doorIndexCode).toBeDefined();
      }
    });
  });
});
