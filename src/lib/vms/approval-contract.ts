import type { VisitStatus } from "./vms-contract";

export const APPROVAL_ACTIONS = ["approve", "reject"] as const;
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

export function isApprovalAction(value: unknown): value is ApprovalAction {
  return (
    typeof value === "string" &&
    (APPROVAL_ACTIONS as readonly string[]).includes(value)
  );
}

export interface ApprovalDecisionInput {
  action: ApprovalAction;
  comment?: string;
}

export interface ApproverUser {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface ApprovalRecord {
  id: string;
  visitId: string;
  action: ApprovalAction;
  previousStatus: VisitStatus;
  newStatus: VisitStatus;
  approverId: string;
  approverName: string;
  approverRole?: string;
  comment?: string;
  decidedAtUtc: string;
  hikCentralSyncStatus?: "synced" | "failed" | "skipped";
}

export interface MonitoringListMatch {
  id?: string;
  enableRegister?: number;
  rejectNum?: number;
  visitorType?: number;
  type?: string;
  remark?: string;
  visitorTypeName?: string;
  identificationType?: number;
  certificateNo?: string;
}

export interface MonitoringListFlag {
  isFlagged: boolean;
  flaggedAtUtc: string;
  reason?: string;
  matches?: MonitoringListMatch[];
}

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
 * Enforces mandatory comments on rejection.
 */
export function validateApprovalDecision(
  raw: unknown,
): ApprovalValidationOutcome {
  const errors: Record<string, string> = {};

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {
      valid: false,
      errors: { _global: "Request payload must be an object." },
    };
  }

  const record = raw as Record<string, unknown>;

  // Action validation
  if (!isApprovalAction(record.action)) {
    errors.action = `Action must be one of: ${APPROVAL_ACTIONS.join(", ")}.`;
  }

  // Comment validation
  let comment: string | undefined;
  if (record.comment !== undefined && record.comment !== null) {
    if (typeof record.comment === "string") {
      const trimmed = record.comment.trim();
      if (trimmed.length > 500) {
        errors.comment = "Comment must be at most 500 characters.";
      } else if (trimmed.length > 0) {
        comment = trimmed;
      }
    } else {
      errors.comment = "Comment must be a string.";
    }
  }

  // Reject action requires a non-empty comment explaining the rejection reason
  if (record.action === "reject" && (!comment || comment.length === 0)) {
    errors.comment = "A non-empty rejection reason comment is required.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    input: {
      action: record.action as ApprovalAction,
      comment,
    },
  };
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
