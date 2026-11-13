import { describe, it, expect } from "vitest";
import {
  DOOR_ACCESS_TYPES,
  DOOR_DIRECTIONS,
  EMERGENCY_GRANT_STATUSES,
  evaluateOverstayStatus,
  isDoorAccessType,
  isDoorDirection,
  isEmergencyGrantActive,
  isEmergencyGrantStatus,
  isTapQuotaExceeded,
  validateCheckOutInput,
  validateDoorTapInput,
  validateFacilityDoorInput,
  validateGrantEmergencyAccessInput,
  type CheckOutInput,
  type DoorTapEvent,
  type EmergencyAccessGrant,
  type FacilityDoor,
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

  describe("DOOR_ACCESS_TYPES and isDoorAccessType", () => {
    it("defines valid tuple and derives runtime guard for access types", () => {
      expect(DOOR_ACCESS_TYPES).toEqual(["DUAL_DIRECTION", "SINGLE_DIRECTION_IN"]);
      expect(isDoorAccessType("DUAL_DIRECTION")).toBe(true);
      expect(isDoorAccessType("SINGLE_DIRECTION_IN")).toBe(true);
      expect(isDoorAccessType("ONE_WAY")).toBe(false);
      expect(isDoorAccessType("BI_DIRECTIONAL")).toBe(false);
      expect(isDoorAccessType(123)).toBe(false);
      expect(isDoorAccessType(null)).toBe(false);
    });
  });

  describe("validateFacilityDoorInput", () => {
    it("accepts valid facility door configuration", () => {
      const valid: FacilityDoor = {
        id: "door-jkt-1",
        facilityId: "fac-jakarta",
        doorIndexCode: "door-turnstile-1",
        doorName: "Main Entrance Turnstile",
        accessType: "DUAL_DIRECTION",
        isPerimeter: true,
        roomTimeoutMinutes: 60,
      };

      const res = validateFacilityDoorInput(valid);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.input.facilityId).toBe("fac-jakarta");
        expect(res.input.doorIndexCode).toBe("door-turnstile-1");
        expect(res.input.accessType).toBe("DUAL_DIRECTION");
        expect(res.input.isPerimeter).toBe(true);
        expect(res.input.roomTimeoutMinutes).toBe(60);
      }
    });

    it("defaults accessType to DUAL_DIRECTION if omitted and isPerimeter to false", () => {
      const res = validateFacilityDoorInput({
        facilityId: "fac-jakarta",
        doorIndexCode: "door-inner-1",
        doorName: "Inner Meeting Room",
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.input.accessType).toBe("DUAL_DIRECTION");
        expect(res.input.isPerimeter).toBe(false);
      }
    });

    it("rejects invalid accessType or missing required fields", () => {
      const res = validateFacilityDoorInput({
        facilityId: "",
        doorIndexCode: "",
        doorName: "",
        accessType: "INVALID_TYPE",
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.errors.facilityId).toBeDefined();
        expect(res.errors.doorIndexCode).toBeDefined();
        expect(res.errors.doorName).toBeDefined();
        expect(res.errors.accessType).toMatch(/must be 'DUAL_DIRECTION' or 'SINGLE_DIRECTION_IN'/i);
      }
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

    it("maps inAndOutType 1 to 'in' and 2 to 'out' accurately", () => {
      const resIn = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        inAndOutType: 1,
      });
      expect(resIn.valid).toBe(true);
      if (resIn.valid) {
        expect(resIn.input.direction).toBe("in");
        expect(resIn.input.inAndOutType).toBe(1);
      }

      const resOut = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        inAndOutType: 2,
      });
      expect(resOut.valid).toBe(true);
      if (resOut.valid) {
        expect(resOut.input.direction).toBe("out");
        expect(resOut.input.inAndOutType).toBe(2);
      }
    });

    it("infers inAndOutType when only direction is provided", () => {
      const resIn = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        direction: "in",
      });
      expect(resIn.valid).toBe(true);
      if (resIn.valid) {
        expect(resIn.input.inAndOutType).toBe(1);
      }

      const resOut = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        direction: "out",
      });
      expect(resOut.valid).toBe(true);
      if (resOut.valid) {
        expect(resOut.input.inAndOutType).toBe(2);
      }
    });

    it("rejects conflicting inAndOutType and direction or invalid inAndOutType", () => {
      const mismatch = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        direction: "in",
        inAndOutType: 2,
      });
      expect(mismatch.valid).toBe(false);
      if (!mismatch.valid) {
        expect(mismatch.errors.inAndOutType).toMatch(/does not match/i);
      }

      const invalidCode = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-turnstile-1",
        inAndOutType: 99,
      });
      expect(invalidCode.valid).toBe(false);
      if (!invalidCode.valid) {
        expect(invalidCode.errors.inAndOutType).toBeDefined();
      }
    });

    it("preserves isPerimeter, isImplicit, implicit, and transitionNote metadata", () => {
      const res = validateDoorTapInput({
        visitId: "vis-101",
        doorIndexCode: "door-jkt-dc-01",
        doorName: "DC Server Room 01",
        direction: "out",
        isPerimeter: false,
        isImplicit: true,
        transitionNote: "Implicit departure upon scanning into Room B",
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.input.isPerimeter).toBe(false);
        expect(res.input.isImplicit).toBe(true);
        expect(res.input.implicit).toBe(true);
        expect(res.input.transitionNote).toBe("Implicit departure upon scanning into Room B");
      }
    });
  });

  describe("Emergency Access Escalation Contracts", () => {
    describe("EMERGENCY_GRANT_STATUSES and isEmergencyGrantStatus", () => {
      it("defines the three canonical grant statuses", () => {
        expect(EMERGENCY_GRANT_STATUSES).toEqual(["ACTIVE", "EXPIRED", "REVOKED"]);
        expect(isEmergencyGrantStatus("ACTIVE")).toBe(true);
        expect(isEmergencyGrantStatus("EXPIRED")).toBe(true);
        expect(isEmergencyGrantStatus("REVOKED")).toBe(true);
        expect(isEmergencyGrantStatus("PENDING")).toBe(false);
        expect(isEmergencyGrantStatus(null)).toBe(false);
        expect(isEmergencyGrantStatus(123)).toBe(false);
      });
    });

    describe("validateGrantEmergencyAccessInput", () => {
      it("validates valid input with explicit future expiresAtUtc", () => {
        const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        const res = validateGrantEmergencyAccessInput({
          visitId: "vis-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          doorNames: ["DC Server Room 01"],
          grantedByUserId: "user-sec-01",
          grantedByName: "Officer Alex",
          reason: "Urgent fiber maintenance in server room",
          expiresAtUtc: futureDate,
        });

        expect(res.valid).toBe(true);
        if (res.valid) {
          expect(res.input.visitId).toBe("vis-101");
          expect(res.input.doorIndexCodes).toEqual(["door-jkt-dc-01"]);
          expect(res.input.doorNames).toEqual(["DC Server Room 01"]);
          expect(res.input.grantedByUserId).toBe("user-sec-01");
          expect(res.input.grantedByName).toBe("Officer Alex");
          expect(res.input.reason).toBe("Urgent fiber maintenance in server room");
          expect(res.input.expiresAtUtc).toBe(futureDate);
        }
      });

      it("calculates expiresAtUtc when durationHours is specified", () => {
        const baseTime = "2026-11-13T10:00:00.000Z";
        const res = validateGrantEmergencyAccessInput({
          visitId: "vis-101",
          doorIndexCode: "door-jkt-dc-01",
          grantedByUserId: "user-sec-01",
          reason: "HVAC cooling emergency inspection",
          durationHours: 3,
          grantedAtUtc: baseTime,
        });

        expect(res.valid).toBe(true);
        if (res.valid) {
          expect(res.input.doorIndexCodes).toEqual(["door-jkt-dc-01"]);
          expect(res.input.expiresAtUtc).toBe("2026-11-13T13:00:00.000Z");
        }
      });

      it("rejects input with reason shorter than 10 characters", () => {
        const res = validateGrantEmergencyAccessInput({
          visitId: "vis-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "user-sec-01",
          reason: "Too short",
          durationHours: 2,
        });

        expect(res.valid).toBe(false);
        if (!res.valid) {
          expect(res.errors.reason).toMatch(/at least 10 characters/i);
        }
      });

      it("rejects input when doors or operator user ID are missing", () => {
        const res = validateGrantEmergencyAccessInput({
          visitId: "vis-101",
          doorIndexCodes: [],
          grantedByUserId: "",
          reason: "Valid reason for urgent access",
          durationHours: 2,
        });

        expect(res.valid).toBe(false);
        if (!res.valid) {
          expect(res.errors.doorIndexCodes).toBeDefined();
          expect(res.errors.grantedByUserId).toBeDefined();
        }
      });

      it("rejects expiration in the past", () => {
        const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
        const res = validateGrantEmergencyAccessInput({
          visitId: "vis-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "user-sec-01",
          reason: "Valid justification for datacenter inspection",
          expiresAtUtc: pastDate,
        });

        expect(res.valid).toBe(false);
        if (!res.valid) {
          expect(res.errors.expiresAtUtc).toMatch(/future/i);
        }
      });

      it("rejects non-object payload", () => {
        expect(validateGrantEmergencyAccessInput(null).valid).toBe(false);
        expect(validateGrantEmergencyAccessInput("string").valid).toBe(false);
        expect(validateGrantEmergencyAccessInput([]).valid).toBe(false);
      });
    });

    describe("isEmergencyGrantActive", () => {
      const grant: EmergencyAccessGrant = {
        id: "grant-1",
        visitId: "vis-101",
        doorIndexCodes: ["door-jkt-dc-01"],
        doorNames: ["DC Server Room 01"],
        grantedByUserId: "user-sec-01",
        grantedByName: "Officer Alex",
        reason: "Datacenter server outage remediation",
        grantedAtUtc: "2026-11-13T10:00:00.000Z",
        expiresAtUtc: "2026-11-13T12:00:00.000Z",
        status: "ACTIVE",
      };

      it("returns true when grant is ACTIVE and before expiration", () => {
        expect(isEmergencyGrantActive(grant, "2026-11-13T11:00:00.000Z")).toBe(true);
      });

      it("returns false when current time is after expiration", () => {
        expect(isEmergencyGrantActive(grant, "2026-11-13T12:01:00.000Z")).toBe(false);
      });

      it("returns false when grant status is REVOKED or EXPIRED", () => {
        expect(isEmergencyGrantActive({ ...grant, status: "REVOKED" }, "2026-11-13T11:00:00.000Z")).toBe(false);
        expect(isEmergencyGrantActive({ ...grant, status: "EXPIRED" }, "2026-11-13T11:00:00.000Z")).toBe(false);
      });
    });
  });
});
