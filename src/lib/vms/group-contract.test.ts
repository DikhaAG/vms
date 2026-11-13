import { describe, expect, it } from "vitest";
import {
  validateGroupVisitInput,
  validateSoftDeleteInput,
  type GroupVisitInput,
} from "./group-contract";

describe("group-contract", () => {
  const validBaseInput: GroupVisitInput = {
    facilityId: "fac-jakarta",
    hostId: "emp-101",
    hostName: "Budi Santoso",
    visitorGroupName: "Google DeepMind Delegation",
    scheduledStartTime: "2026-11-13T14:00:00+07:00",
    scheduledEndTime: "2026-11-13T17:00:00+07:00",
    visitReasonType: 3, // Meeting
    accessLevelIds: ["acc-jkt-lobby"],
    tapQuota: { mode: "limited", maxTaps: 4 },
    visitors: [
      {
        visitorFamilyName: "Hassabis",
        visitorGivenName: "Demis",
        visitorPhone: "+442071234567",
        visitorEmail: "demis@deepmind.com",
        certificateType: 414, // Passport
        certificateNo: "GBR12345678",
        facePhoto: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      },
      {
        visitorFamilyName: "Dean",
        visitorGivenName: "Jeff",
        visitorPhone: "+16501234567",
        visitorEmail: "jeff@google.com",
        certificateType: 414,
        certificateNo: "USA98765432",
      },
    ],
  };

  describe("validateGroupVisitInput", () => {
    it("accepts valid group visit input with multiple visitors", () => {
      const outcome = validateGroupVisitInput(validBaseInput);
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.visitorGroupName).toBe("Google DeepMind Delegation");
        expect(outcome.input.visitors).toHaveLength(2);
        expect(outcome.input.visitors[0].visitorGivenName).toBe("Demis");
        expect(outcome.input.visitors[1].visitorGivenName).toBe("Jeff");
      }
    });

    it("rejects non-object input", () => {
      const outcome = validateGroupVisitInput(null);
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors._global).toBeDefined();
      }
    });

    it("rejects missing facilityId", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        facilityId: "",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.facilityId).toMatch(/facility/i);
      }
    });

    it("rejects missing or empty visitorGroupName", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        visitorGroupName: "   ",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitorGroupName).toMatch(/group name/i);
      }
    });

    it("rejects visitorGroupName containing forbidden HikCentral characters", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        visitorGroupName: "Delegation / Team * A",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitorGroupName).toMatch(/special characters/i);
      }
    });

    it("rejects missing or empty visitors array", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        visitors: [],
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitors).toMatch(/at least one visitor/i);
      }
    });

    it("validates individual visitor fields inside the array", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        visitors: [
          {
            visitorFamilyName: "",
            visitorGivenName: "Demis",
          },
          {
            visitorFamilyName: "Dean",
            visitorGivenName: "",
            visitorEmail: "invalid-email",
            visitorPhone: "12345678901234567890123", // > 20 chars
            certificateNo: "12345678901234567890123", // > 20 chars
          },
        ],
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors["visitors[0].visitorFamilyName"]).toBeDefined();
        expect(outcome.errors["visitors[1].visitorGivenName"]).toBeDefined();
        expect(outcome.errors["visitors[1].visitorEmail"]).toBeDefined();
        expect(outcome.errors["visitors[1].visitorPhone"]).toBeDefined();
        expect(outcome.errors["visitors[1].certificateNo"]).toBeDefined();
      }
    });

    it("requires visitReasonDetail when visitReasonType is Others (4)", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        visitReasonType: 4,
        visitReasonDetail: "",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitReasonDetail).toMatch(/detail is required/i);
      }
    });

    it("rejects scheduledEndTime before scheduledStartTime", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        scheduledStartTime: "2026-11-13T18:00:00+07:00",
        scheduledEndTime: "2026-11-13T16:00:00+07:00",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.scheduledEndTime).toMatch(/after start time/i);
      }
    });
  });

  describe("validateSoftDeleteInput", () => {
    it("accepts valid soft-delete payload with reason", () => {
      const outcome = validateSoftDeleteInput({
        isDeleted: true,
        reason: "User requested personal data erasure under PDP compliance",
      });
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.isDeleted).toBe(true);
        expect(outcome.input.reason).toMatch(/PDP compliance/);
      }
    });

    it("accepts valid restore payload", () => {
      const outcome = validateSoftDeleteInput({
        isDeleted: false,
      });
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.isDeleted).toBe(false);
      }
    });

    it("rejects non-boolean isDeleted", () => {
      const outcome = validateSoftDeleteInput({
        isDeleted: "true",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.isDeleted).toMatch(/boolean/i);
      }
    });

    it("rejects non-object payload", () => {
      const outcome = validateSoftDeleteInput("invalid");
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors._global).toBeDefined();
      }
    });
  });
});
