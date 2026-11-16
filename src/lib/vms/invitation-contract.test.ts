import { describe, expect, it } from "vitest";
import {
  isInvitationStatus,
  validateCreateInvitationInput,
  validateSelfRegistrationSubmission,
  invitationStatusSchema,
  createInvitationSchema,
  selfRegistrationSubmissionSchema,
  publicInvitationMetadataSchema,
} from "./invitation-contract";

describe("invitation-contract", () => {
  describe("isInvitationStatus", () => {
    it("recognizes valid invitation statuses", () => {
      expect(isInvitationStatus("valid")).toBe(true);
      expect(isInvitationStatus("invalid")).toBe(true);
      expect(isInvitationStatus("expired")).toBe(true);
      expect(isInvitationStatus("consumed")).toBe(true);
      expect(isInvitationStatus("pending")).toBe(false);
      expect(isInvitationStatus(123)).toBe(false);
    });
  });

  describe("validateCreateInvitationInput", () => {
    const validBase = {
      hostName: "Budi Santoso",
      visitReasonType: 3,
      visitReasonDetail: "Vendor Review",
      scheduledStartTime: "2026-11-20T09:00",
      scheduledEndTime: "2026-11-20T11:00",
    };

    it("accepts valid invitation input", () => {
      const outcome = validateCreateInvitationInput(validBase);
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.visitReasonType).toBe(3);
      }
    });

    it("rejects non-object payloads", () => {
      expect(validateCreateInvitationInput(null).valid).toBe(false);
      expect(validateCreateInvitationInput("invalid").valid).toBe(false);
      expect(validateCreateInvitationInput([]).valid).toBe(false);
    });

    it("validates required fields", () => {
      const outcome = validateCreateInvitationInput({});
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.scheduledStartTime).toBeDefined();
        expect(outcome.errors.scheduledEndTime).toBeDefined();
        expect(outcome.errors.visitReasonType).toBeDefined();
      }
    });

    it("enforces visit reason detail when reason type is Others (4)", () => {
      const outcome = validateCreateInvitationInput({
        ...validBase,
        visitReasonType: 4,
        visitReasonDetail: "",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitReasonDetail).toBeDefined();
      }
    });

    it("validates end time must be after start time", () => {
      const outcome = validateCreateInvitationInput({
        ...validBase,
        scheduledStartTime: "2026-11-20T11:00",
        scheduledEndTime: "2026-11-20T09:00",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.scheduledEndTime).toBeDefined();
      }
    });

    it("validates optional prefilled visitor email format", () => {
      const outcome = validateCreateInvitationInput({
        ...validBase,
        visitorEmail: "not-an-email",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitorEmail).toBeDefined();
      }
    });
  });

  describe("validateSelfRegistrationSubmission", () => {
    const validSubmission = {
      visitorFamilyName: "Wijaya",
      visitorGivenName: "Andi",
      visitorPhone: "+628123456789",
      visitorEmail: "andi.wijaya@example.com",
      certificateType: 111,
      certificateNo: "3171012345670001",
    };

    it("accepts valid self-registration submission", () => {
      const outcome = validateSelfRegistrationSubmission(validSubmission);
      expect(outcome.valid).toBe(true);
      if (outcome.valid) {
        expect(outcome.input.visitorFamilyName).toBe("Wijaya");
        expect(outcome.input.visitorGivenName).toBe("Andi");
      }
    });

    it("rejects missing visitor names", () => {
      const outcome = validateSelfRegistrationSubmission({
        ...validSubmission,
        visitorFamilyName: "",
        visitorGivenName: "",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitorFamilyName).toBeDefined();
        expect(outcome.errors.visitorGivenName).toBeDefined();
      }
    });

    it("rejects special characters forbidden by HikCentral in names", () => {
      const outcome = validateSelfRegistrationSubmission({
        ...validSubmission,
        visitorFamilyName: "Smith/Jones",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.visitorFamilyName).toBeDefined();
      }
    });

    it("requires certificateType if certificateNo is provided", () => {
      const outcome = validateSelfRegistrationSubmission({
        visitorFamilyName: "Wijaya",
        visitorGivenName: "Andi",
        certificateNo: "3171012345670001",
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.certificateType).toBeDefined();
      }
    });

    it("validates optional facePhoto string", () => {
      const outcome = validateSelfRegistrationSubmission({
        ...validSubmission,
        facePhoto: 12345 as unknown as string,
      });
      expect(outcome.valid).toBe(false);
      if (!outcome.valid) {
        expect(outcome.errors.facePhoto).toBeDefined();
      }
    });
  });

  describe("Zod canonical schemas directly", () => {
    it("validates invitationStatusSchema", () => {
      expect(invitationStatusSchema.safeParse("valid").success).toBe(true);
      expect(invitationStatusSchema.safeParse("consumed").success).toBe(true);
      expect(invitationStatusSchema.safeParse("expired").success).toBe(true);
      expect(invitationStatusSchema.safeParse("pending").success).toBe(false);
    });

    it("validates createInvitationSchema directly", () => {
      const valid = createInvitationSchema.safeParse({
        visitReasonType: 0,
        scheduledStartTime: "2026-11-20T09:00",
        scheduledEndTime: "2026-11-20T11:00",
      });
      expect(valid.success).toBe(true);
    });

    it("validates selfRegistrationSubmissionSchema directly", () => {
      const valid = selfRegistrationSubmissionSchema.safeParse({
        visitorFamilyName: "Wijaya",
        visitorGivenName: "Andi",
      });
      expect(valid.success).toBe(true);
    });

    it("validates publicInvitationMetadataSchema directly", () => {
      const valid = publicInvitationMetadataSchema.safeParse({
        token: "tok-abc-123456",
        visitId: "vis-1",
        status: "valid",
        site: {
          name: "Jakarta HQ",
          timezone: "Asia/Jakarta",
        },
        visitReasonType: 3,
        visitReasonLabel: "Meeting",
        scheduledStartTimeFacility: "2026-11-20 09:00",
        scheduledEndTimeFacility: "2026-11-20 11:00",
        scheduledStartTimeUtc: "2026-11-20T02:00:00Z",
        scheduledEndTimeUtc: "2026-11-20T04:00:00Z",
        expiresAtUtc: "2026-11-20T04:00:00Z",
        isConsumed: false,
      });
      expect(valid.success).toBe(true);
    });
  });
});
