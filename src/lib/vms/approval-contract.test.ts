import { describe, it, expect } from "vitest";
import {
  APPROVAL_ACTIONS,
  isApprovalAction,
  validateApprovalDecision,
  isAllowedApprovalTransition,
  approvalActionSchema,
  approvalDecisionSchema,
  approverUserSchema,
  approvalRecordSchema,
  monitoringListMatchSchema,
  monitoringListFlagSchema,
} from "./approval-contract";
import type { VisitStatus } from "./vms-contract";

describe("Approval Contract & Validators", () => {
  describe("APPROVAL_ACTIONS & isApprovalAction", () => {
    it("recognizes valid approval actions", () => {
      expect(APPROVAL_ACTIONS).toContain("approve");
      expect(APPROVAL_ACTIONS).toContain("reject");
      expect(isApprovalAction("approve")).toBe(true);
      expect(isApprovalAction("reject")).toBe(true);
    });

    it("rejects invalid actions", () => {
      expect(isApprovalAction("pending")).toBe(false);
      expect(isApprovalAction("escalate")).toBe(false);
      expect(isApprovalAction(null)).toBe(false);
      expect(isApprovalAction(undefined)).toBe(false);
      expect(isApprovalAction(123)).toBe(false);
    });
  });

  describe("validateApprovalDecision", () => {
    it("validates a valid approve decision without comment", () => {
      const result = validateApprovalDecision({ action: "approve" });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.input.action).toBe("approve");
        expect(result.input.comment).toBeUndefined();
      }
    });

    it("validates a valid approve decision with optional comment", () => {
      const result = validateApprovalDecision({
        action: "approve",
        comment: "Authorized for client presentation in boardroom.",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.input.action).toBe("approve");
        expect(result.input.comment).toBe(
          "Authorized for client presentation in boardroom.",
        );
      }
    });

    it("validates a valid reject decision with mandatory comment", () => {
      const result = validateApprovalDecision({
        action: "reject",
        comment: "Host is unavailable and meeting rescheduled to next week.",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.input.action).toBe("reject");
        expect(result.input.comment).toBe(
          "Host is unavailable and meeting rescheduled to next week.",
        );
      }
    });

    it("fails when reject decision has missing or empty comment", () => {
      const emptyComment = validateApprovalDecision({
        action: "reject",
        comment: "   ",
      });
      expect(emptyComment.valid).toBe(false);
      if (!emptyComment.valid) {
        expect(emptyComment.errors.comment).toBeDefined();
        expect(emptyComment.errors.comment).toMatch(/rejection reason/i);
      }

      const omittedComment = validateApprovalDecision({ action: "reject" });
      expect(omittedComment.valid).toBe(false);
      if (!omittedComment.valid) {
        expect(omittedComment.errors.comment).toBeDefined();
      }
    });

    it("fails when action is missing or invalid", () => {
      const invalidAction = validateApprovalDecision({ action: "cancel" });
      expect(invalidAction.valid).toBe(false);
      if (!invalidAction.valid) {
        expect(invalidAction.errors.action).toBeDefined();
      }

      const nonObject = validateApprovalDecision("approve");
      expect(nonObject.valid).toBe(false);
      if (!nonObject.valid) {
        expect(nonObject.errors._global).toBeDefined();
      }
    });

    it("fails when comment exceeds max length of 500 characters", () => {
      const longComment = "a".repeat(501);
      const result = validateApprovalDecision({
        action: "approve",
        comment: longComment,
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.comment).toBeDefined();
      }
    });
  });

  describe("isAllowedApprovalTransition", () => {
    it("allows approval decisions from PENDING_APPROVAL", () => {
      expect(isAllowedApprovalTransition("PENDING_APPROVAL", "approve")).toBe(true);
      expect(isAllowedApprovalTransition("PENDING_APPROVAL", "reject")).toBe(true);
    });

    it("allows approval decisions from SECURITY_ESCALATED", () => {
      expect(isAllowedApprovalTransition("SECURITY_ESCALATED", "approve")).toBe(true);
      expect(isAllowedApprovalTransition("SECURITY_ESCALATED", "reject")).toBe(true);
    });

    it("disallows decisions from terminal or active states", () => {
      const invalidStatuses: VisitStatus[] = [
        "DRAFT",
        "APPROVED",
        "REJECTED",
        "CHECKED_IN",
        "CHECKED_OUT",
        "CANCELLED",
        "OVERSTAY",
      ];

      for (const status of invalidStatuses) {
        expect(isAllowedApprovalTransition(status, "approve")).toBe(false);
        expect(isAllowedApprovalTransition(status, "reject")).toBe(false);
      }
    });
  });

  describe("Zod canonical schemas directly", () => {
    it("validates approvalActionSchema", () => {
      expect(approvalActionSchema.safeParse("approve").success).toBe(true);
      expect(approvalActionSchema.safeParse("reject").success).toBe(true);
      expect(approvalActionSchema.safeParse("other").success).toBe(false);
    });

    it("validates approvalDecisionSchema directly", () => {
      const approveRes = approvalDecisionSchema.safeParse({ action: "approve" });
      expect(approveRes.success).toBe(true);

      const rejectMissingComment = approvalDecisionSchema.safeParse({ action: "reject" });
      expect(rejectMissingComment.success).toBe(false);

      const rejectWithComment = approvalDecisionSchema.safeParse({
        action: "reject",
        comment: "Security discrepancy",
      });
      expect(rejectWithComment.success).toBe(true);
    });

    it("validates approverUserSchema and monitoringListFlagSchema", () => {
      const userRes = approverUserSchema.safeParse({
        id: "usr-01",
        name: "Security Chief",
      });
      expect(userRes.success).toBe(true);

      const flagRes = monitoringListFlagSchema.safeParse({
        isFlagged: true,
        flaggedAtUtc: "2026-11-13T10:00:00Z",
        reason: "Blacklist watch match",
      });
      expect(flagRes.success).toBe(true);
    });

    it("validates approvalRecordSchema and monitoringListMatchSchema directly", () => {
      const recordRes = approvalRecordSchema.safeParse({
        id: "app-rec-1",
        visitId: "vis-1",
        action: "approve",
        previousStatus: "PENDING_APPROVAL",
        newStatus: "APPROVED",
        approverId: "usr-01",
        approverName: "Security Chief",
        decidedAtUtc: "2026-11-13T10:00:00Z",
      });
      expect(recordRes.success).toBe(true);

      const matchRes = monitoringListMatchSchema.safeParse({
        listType: "blacklist",
        matchedName: "John Doe",
        similarity: 0.95,
      });
      expect(matchRes.success).toBe(true);
    });
  });
});
