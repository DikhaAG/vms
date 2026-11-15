import { describe, expect, it } from "vitest";
import {
  VERIFICATION_METHODS,
  isVerificationMethod,
  validateCheckInInput,
  validateWalkInRegistrationInput,
  validateVisitorSearchQuery,
  verificationMethodSchema,
  checkInInputSchema,
  walkInRegistrationSchema,
  visitorSearchQuerySchema,
} from "./checkin-contract";

describe("checkin-contract", () => {
  describe("runtime guards and options", () => {
    it("recognizes valid verification methods", () => {
      for (const method of VERIFICATION_METHODS) {
        expect(isVerificationMethod(method)).toBe(true);
      }
      expect(isVerificationMethod("carrier-pigeon")).toBe(false);
      expect(isVerificationMethod(null)).toBe(false);
      expect(isVerificationMethod(123)).toBe(false);
    });
  });

  describe("validateCheckInInput", () => {
    it("passes for valid check-in input", () => {
      const outcome = validateCheckInInput({
        visitId: "vis-12345",
        receptionistUserId: "rec-01",
        receptionistName: "Alice Frontdesk",
        verificationMethod: "qr",
        notes: "Verified physical badge",
      });

      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.visitId).toBe("vis-12345");
        expect(outcome.input.receptionistUserId).toBe("rec-01");
        expect(outcome.input.verificationMethod).toBe("qr");
      }
    });

    it("rejects non-object or missing mandatory fields", () => {
      expect(validateCheckInInput(null).valid).toBe(false);
      expect(validateCheckInInput("string").valid).toBe(false);

      const missingId = validateCheckInInput({
        receptionistUserId: "rec-01",
      });
      expect(missingId.valid).toBe(false);
      if (!missingId.valid) {
        expect(missingId.errors.visitId).toBeDefined();
      }

      const missingUser = validateCheckInInput({
        visitId: "vis-12345",
      });
      expect(missingUser.valid).toBe(false);
      if (!missingUser.valid) {
        expect(missingUser.errors.receptionistUserId).toBeDefined();
      }
    });

    it("validates optional actualCheckInTimeUtc format if supplied", () => {
      const invalidTime = validateCheckInInput({
        visitId: "vis-12345",
        receptionistUserId: "rec-01",
        actualCheckInTimeUtc: "not-a-date",
      });
      expect(invalidTime.valid).toBe(false);
      if (!invalidTime.valid) {
        expect(invalidTime.errors.actualCheckInTimeUtc).toBeDefined();
      }

      const validTime = validateCheckInInput({
        visitId: "vis-12345",
        receptionistUserId: "rec-01",
        actualCheckInTimeUtc: "2026-11-13T04:00:00Z",
      });
      expect(validTime.valid).toBe(true);
    });
  });

  describe("validateWalkInRegistrationInput", () => {
    it("passes for valid walk-in payload", () => {
      const outcome = validateWalkInRegistrationInput({
        facilityId: "fac-jakarta",
        hostId: "emp-host-01",
        hostName: "Budi Santoso",
        visitorFamilyName: "Pratama",
        visitorGivenName: "Rian",
        visitorPhone: "08123456789",
        visitorEmail: "rian.pratama@example.com",
        certificateType: 111,
        certificateNo: "3171000000000001",
        visitReasonType: 0,
        accessLevelIds: ["acc-jkt-lobby"],
        tapQuota: {
          mode: "limited",
          maxTaps: 2,
        },
        receptionistUserId: "rec-01",
        receptionistName: "Alice Frontdesk",
        verificationMethod: "id_card",
      });

      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.visitorFamilyName).toBe("Pratama");
        expect(outcome.input.receptionistUserId).toBe("rec-01");
        expect(outcome.input.tapQuota?.mode).toBe("limited");
        expect(outcome.input.tapQuota?.maxTaps).toBe(2);
      }
    });

    it("rejects invalid characters in visitor names per HikCentral requirements", () => {
      const outcome = validateWalkInRegistrationInput({
        facilityId: "fac-jakarta",
        visitorFamilyName: "Pratama<script>",
        visitorGivenName: "Rian",
        visitReasonType: 0,
        receptionistUserId: "rec-01",
      });

      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitorFamilyName).toBeDefined();
      }
    });

    it("enforces visitReasonDetail if visitReasonType is Others (4)", () => {
      const outcome = validateWalkInRegistrationInput({
        facilityId: "fac-jakarta",
        visitorFamilyName: "Pratama",
        visitorGivenName: "Rian",
        visitReasonType: 4,
        receptionistUserId: "rec-01",
      });

      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitReasonDetail).toBeDefined();
      }
    });
  });

  describe("validateVisitorSearchQuery", () => {
    it("passes with search query and facilityId", () => {
      const outcome = validateVisitorSearchQuery({
        query: "Pratama",
        facilityId: "fac-jakarta",
      });

      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.query).toBe("Pratama");
        expect(outcome.input.facilityId).toBe("fac-jakarta");
      }
    });

    it("trims search query and handles empty string query gracefully", () => {
      const outcome = validateVisitorSearchQuery({
        query: "   ",
      });

      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.query).toBe("");
      }
    });

    it("accepts single or array of visit statuses", () => {
      const outcomeSingle = validateVisitorSearchQuery({
        query: "Rian",
        status: "APPROVED",
      });
      expect(outcomeSingle.valid).toBe(true);

      const outcomeMulti = validateVisitorSearchQuery({
        query: "Rian",
        status: ["APPROVED", "CHECKED_IN"],
      });
      expect(outcomeMulti.valid).toBe(true);
      if (outcomeMulti.valid) {
        expect(outcomeMulti.input.status).toEqual(["APPROVED", "CHECKED_IN"]);
      }
    });
  });

  describe("Zod canonical schemas directly", () => {
    it("validates verificationMethodSchema", () => {
      expect(verificationMethodSchema.safeParse("qr").success).toBe(true);
      expect(verificationMethodSchema.safeParse("manual").success).toBe(true);
      expect(verificationMethodSchema.safeParse("biometric").success).toBe(true);
      expect(verificationMethodSchema.safeParse("id_card").success).toBe(true);
      expect(verificationMethodSchema.safeParse("carrier-pigeon").success).toBe(false);
    });

    it("validates checkInInputSchema directly", () => {
      const valid = checkInInputSchema.safeParse({
        visitId: "vis-123",
        receptionistUserId: "rec-01",
        verificationMethod: "qr",
      });
      expect(valid.success).toBe(true);
    });

    it("validates walkInRegistrationSchema directly", () => {
      const valid = walkInRegistrationSchema.safeParse({
        facilityId: "fac-jkt",
        visitorFamilyName: "Pratama",
        visitorGivenName: "Rian",
        visitReasonType: 0,
        receptionistUserId: "rec-01",
      });
      expect(valid.success).toBe(true);
    });

    it("validates visitorSearchQuerySchema directly", () => {
      const res = visitorSearchQuerySchema.safeParse({
        query: "Budi",
        status: "CHECKED_IN",
      });
      expect(res.success).toBe(true);
    });
  });
});
