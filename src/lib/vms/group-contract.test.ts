import { describe, expect, it } from "vitest";
import {
  validateGroupVisitInput,
  validateSoftDeleteInput,
  visitorPersonalDetailsSchema,
  groupVisitInputSchema,
  memberVisitResultSchema,
  groupVisitResultSchema,
  visitorProfileSchema,
  softDeleteProfileSchema,
  type GroupVisitInput,
} from "./group-contract";

describe("group-contract", () => {
  const validBaseInput: GroupVisitInput = {
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

    it("accepts input without a facility", () => {
      const outcome = validateGroupVisitInput(validBaseInput);
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input).not.toHaveProperty("facilityId");
      }
    });

    it("accepts a legacy client payload carrying facilityId but drops it from the validated input", () => {
      const outcome = validateGroupVisitInput({
        ...validBaseInput,
        facilityId: "fac-jakarta",
      });
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input).not.toHaveProperty("facilityId");
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

  describe("Zod canonical schemas directly", () => {
    it("validates visitorPersonalDetailsSchema directly", () => {
      const valid = visitorPersonalDetailsSchema.safeParse({
        visitorFamilyName: "Hassabis",
        visitorGivenName: "Demis",
        certificateType: 414,
        certificateNo: "GBR123",
      });
      expect(valid.success).toBe(true);

      const invalid = visitorPersonalDetailsSchema.safeParse({
        visitorFamilyName: "Bad/Name",
        visitorGivenName: "Demis",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates softDeleteProfileSchema directly", () => {
      const valid = softDeleteProfileSchema.safeParse({
        isDeleted: true,
        reason: "PDP request",
      });
      expect(valid.success).toBe(true);

      const invalid = softDeleteProfileSchema.safeParse({
        isDeleted: "yes",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates memberVisitResultSchema and groupVisitResultSchema", () => {
      const member = memberVisitResultSchema.safeParse({
        visitId: "vis-1",
        visitorName: "Demis Hassabis",
        status: "APPROVED",
      });
      expect(member.success).toBe(true);

      const group = groupVisitResultSchema.safeParse({
        groupId: "grp-1",
        visitorGroupName: "AI Delegation",
        memberVisits: [{ visitId: "vis-1", visitorName: "Demis Hassabis", status: "APPROVED" }],
        successCount: 1,
        failureCount: 0,
      });
      expect(group.success).toBe(true);
    });

    it("validates groupVisitInputSchema and visitorProfileSchema directly", () => {
      const groupInput = groupVisitInputSchema.safeParse(validBaseInput);
      expect(groupInput.success).toBe(true);

      const profile = visitorProfileSchema.safeParse({
        id: "prof-1",
        certificateType: 111,
        certificateNo: "3171012345670001",
        fullName: "Demis Hassabis",
        isDeleted: false,
        createdAtUtc: "2026-11-13T10:00:00Z",
        updatedAtUtc: "2026-11-13T10:00:00Z",
      });
      expect(profile.success).toBe(true);
    });
  });
});
