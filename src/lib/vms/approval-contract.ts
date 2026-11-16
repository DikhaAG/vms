import { z } from "zod";
import type { VisitStatus } from "./vms-contract";
import { formatZodErrors, isRecord } from "./validation-helpers";

export const APPROVAL_ACTIONS = ["approve", "reject"] as const;

export const approvalActionSchema = z.enum(APPROVAL_ACTIONS, {
  error: `Action must be one of: ${APPROVAL_ACTIONS.join(", ")}.`,
});
export type ApprovalAction = z.infer<typeof approvalActionSchema>;

export function isApprovalAction(value: unknown): value is ApprovalAction {
  return approvalActionSchema.safeParse(value).success;
}

export const approvalDecisionSchema = z
  .object({
    action: approvalActionSchema,
    comment: z
      .string({ error: "Comment must be a string." })
      .trim()
      .max(500, "Comment must be at most 500 characters.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "reject") {
      if (!data.comment || data.comment.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["comment"],
          message: "A non-empty rejection reason comment is required.",
        });
      }
    }
  });
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;

export const approverUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  email: z.string().optional(),
});
export type ApproverUser = z.infer<typeof approverUserSchema>;

export const approvalRecordSchema = z.object({
  id: z.string(),
  visitId: z.string(),
  action: approvalActionSchema,
  previousStatus: z.custom<VisitStatus>(),
  newStatus: z.custom<VisitStatus>(),
  approverId: z.string(),
  approverName: z.string(),
  approverRole: z.string().optional(),
  comment: z.string().optional(),
  decidedAtUtc: z.string(),
  hikCentralSyncStatus: z.enum(["synced", "failed", "skipped"]).optional(),
});
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;

export const monitoringListMatchSchema = z.object({
  id: z.string().optional(),
  enableRegister: z.number().optional(),
  rejectNum: z.number().optional(),
  visitorType: z.number().optional(),
  type: z.string().optional(),
  remark: z.string().optional(),
  visitorTypeName: z.string().optional(),
  identificationType: z.number().optional(),
  certificateNo: z.string().optional(),
});
export type MonitoringListMatch = z.infer<typeof monitoringListMatchSchema>;

export const monitoringListFlagSchema = z.object({
  isFlagged: z.boolean(),
  flaggedAtUtc: z.string(),
  reason: z.string().optional(),
  matches: z.array(monitoringListMatchSchema).optional(),
});
export type MonitoringListFlag = z.infer<typeof monitoringListFlagSchema>;

export interface ApprovalValidationSuccess {
  valid: true;
  input: ApprovalDecisionInput;
}

export interface ApprovalValidationFailure {
  valid: false;
  errors: Record<string, string>;
}

export type ApprovalValidationOutcome =
  | ApprovalValidationSuccess
  | ApprovalValidationFailure;

/**
 * Pure validator for approval decisions.
 * Enforces mandatory comments on rejection. Backward-compatible wrapper.
 */
export function validateApprovalDecision(
  raw: unknown,
): ApprovalValidationOutcome {
  if (!isRecord(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const result = approvalDecisionSchema.safeParse(raw);
  if (result.success) {
    return {
      valid: true,
      input: {
        action: result.data.action,
        comment: result.data.comment || undefined,
      },
    };
  }

  return { valid: false, errors: formatZodErrors(result.error) };
}

/**
 * Checks whether an approval decision transition is allowed from the given status.
 * Decisions can only be made on visits in PENDING_APPROVAL or SECURITY_ESCALATED status.
 */
export function isAllowedApprovalTransition(
  currentStatus: VisitStatus,
  action: ApprovalAction,
): boolean {
  if (!isApprovalAction(action)) {
    return false;
  }
  return (
    currentStatus === "PENDING_APPROVAL" ||
    currentStatus === "SECURITY_ESCALATED"
  );
}
