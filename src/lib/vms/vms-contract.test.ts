import { describe, expect, it } from "vitest";
import {
  isCertificateType,
  isPreRegistrationMode,
  isStubScenario,
  isVisitReasonType,
  isVisitStatus,
  validatePreRegistrationInput,
  type CreatePreRegistrationInput,
} from "./vms-contract";

describe("vms-contract", () => {
  describe("type guards", () => {
    it("identifies valid visit statuses", () => {
      expect(isVisitStatus("PENDING_APPROVAL")).toBe(true);
      expect(isVisitStatus("SECURITY_ESCALATED")).toBe(true);
      expect(isVisitStatus("APPROVED")).toBe(true);
      expect(isVisitStatus("REJECTED")).toBe(true);
      expect(isVisitStatus("INVALID_STATUS")).toBe(false);
    });

    it("identifies valid visit reason types", () => {
      expect(isVisitReasonType(0)).toBe(true);
      expect(isVisitReasonType(3)).toBe(true);
      expect(isVisitReasonType(4)).toBe(true);
      expect(isVisitReasonType(5)).toBe(false);
      expect(isVisitReasonType("0")).toBe(false);
    });

    it("identifies valid certificate types", () => {
      expect(isCertificateType(111)).toBe(true); // ID card
      expect(isCertificateType(414)).toBe(true); // Passport
      expect(isCertificateType(999)).toBe(false);
    });

    it("identifies valid pre-registration modes and stub scenarios", () => {
      expect(isPreRegistrationMode("live")).toBe(true);
      expect(isPreRegistrationMode("stub")).toBe(true);
      expect(isPreRegistrationMode("mock")).toBe(false);

      expect(isStubScenario("success")).toBe(true);
      expect(isStubScenario("auth-error")).toBe(true);
      expect(isStubScenario("network-error")).toBe(true);
      expect(isStubScenario("unknown")).toBe(false);
    });
  });

  describe("validatePreRegistrationInput", () => {
    const validInput: CreatePreRegistrationInput = {
      facilityId: "fac-jakarta",
      visitorFamilyName: "Smith",
      visitorGivenName: "Alice",
      visitorPhone: "+628123456789",
      certificateType: 111,
      certificateNo: "3171012345670001",
      scheduledStartTime: "2026-11-13T10:00:00",
      scheduledEndTime: "2026-11-13T12:00:00",
      visitReasonType: 0,
      mode: "stub",
      stubScenario: "success",
    };

    it("accepts valid input", () => {
      const result = validatePreRegistrationInput(validInput);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.input.visitorFamilyName).toBe("Smith");
      }
    });

    it("requires visitReasonDetail when visitReasonType is 4 (Others)", () => {
      const invalid = { ...validInput, visitReasonType: 4 as const };
      const result = validatePreRegistrationInput(invalid);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.visitReasonDetail).toBeDefined();
      }

      const validWithDetail = {
        ...invalid,
        visitReasonDetail: "Equipment audit",
      };
      const result2 = validatePreRegistrationInput(validWithDetail);
      expect(result2.valid).toBe(true);
    });

    it("rejects special characters in family name or given name forbidden by HikCentral", () => {
      const invalid = {
        ...validInput,
        visitorGivenName: "Alice/Bob?",
      };
      const result = validatePreRegistrationInput(invalid);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.visitorGivenName).toContain(
          "cannot contain special characters",
        );
      }
    });

    it("rejects missing mandatory fields", () => {
      const result = validatePreRegistrationInput({});
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.facilityId).toBeDefined();
        expect(result.errors.visitorFamilyName).toBeDefined();
        expect(result.errors.visitorGivenName).toBeDefined();
        expect(result.errors.scheduledStartTime).toBeDefined();
        expect(result.errors.scheduledEndTime).toBeDefined();
      }
    });

    it("validates scheduled end time is strictly after start time", () => {
      const invertedTimes = {
        ...validInput,
        scheduledStartTime: "2026-11-13T12:00:00",
        scheduledEndTime: "2026-11-13T10:00:00",
      };
      const result = validatePreRegistrationInput(invertedTimes);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.scheduledEndTime).toContain("must be after");
      }
    });
  });
});
