import { randomUUID } from "node:crypto";
import {
  validateApprovalDecision,
  isAllowedApprovalTransition,
  type ApprovalDecisionInput,
  type ApprovalRecord,
  type ApproverUser,
} from "./approval-contract";
import type { CredentialSyncStatus, Visit, VisitStatus } from "./vms-contract";
import { defaultVmsRepository, type IVmsRepository } from "./repository";
import {
  syncApprovalToHikCentral,
  type SyncApprovalParams,
  type SyncApprovalResult,
} from "./hikcentral-approval-adapter";

export interface PendingApprovalsResult {
  pendingVisits: Visit[];
  escalatedVisits: Visit[];
  allVisits: Visit[];
  totalCount: number;
}

export type ApprovalErrorKind =
  | "validation"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "upstream";

export interface ApprovalError {
  kind: ApprovalErrorKind;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
}

export interface ApprovalResult {
  ok: boolean;
  visit?: Visit;
  approvalRecord?: ApprovalRecord;
  error?: ApprovalError;
}

export interface ApprovalServiceDeps {
  repository?: IVmsRepository;
  syncAdapter?: (params: SyncApprovalParams) => Promise<SyncApprovalResult>;
  enableHikCentralSync?: boolean;
  idGenerator?: () => string;
  now?: () => Date;
}

/**
 * Lists visits requiring review (both normal PENDING_APPROVAL and SECURITY_ESCALATED),
 * optionally filtered by facilityId.
 */
export async function listPendingApprovals(
  facilityId?: string,
  deps: { repository?: IVmsRepository } = {},
): Promise<PendingApprovalsResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const visits = await repository.getVisitsByStatus(
    ["PENDING_APPROVAL", "SECURITY_ESCALATED"],
    facilityId,
  );

  const pendingVisits = visits.filter((v) => v.status === "PENDING_APPROVAL");
  const escalatedVisits = visits.filter(
    (v) => v.status === "SECURITY_ESCALATED",
  );

  return {
    pendingVisits,
    escalatedVisits,
    allVisits: visits,
    totalCount: visits.length,
  };
}

/**
 * Decides an approval request (approve or reject) for a visit.
 * Validates transition rules, enforces rejection comments, arms terminal credentials upon approval,
 * updates Visit status in the repository, records an immutable audit log, and optionally notifies HikCentral.
 */
export async function decideApproval(
  visitId: string,
  rawDecision: ApprovalDecisionInput,
  approver: ApproverUser,
  deps: ApprovalServiceDeps = {},
): Promise<ApprovalResult> {
  const repository = deps.repository ?? defaultVmsRepository;
  const generateId = deps.idGenerator ?? randomUUID;
  const getNow = deps.now ?? (() => new Date());

  // 1. Validate decision input
  const validation = validateApprovalDecision(rawDecision);
  if (!validation.valid) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Invalid approval decision payload.",
        fieldErrors: validation.errors,
        status: 400,
      },
    };
  }

  const decision = validation.input;

  // 2. Fetch visit
  const visit = await repository.getVisit(visitId);
  if (!visit) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message: `Visit '${visitId}' not found.`,
        status: 404,
      },
    };
  }

  // 3. State transition validation
  if (visit.status === "APPROVED" || visit.status === "REJECTED") {
    return {
      ok: false,
      error: {
        kind: "conflict",
        message: `Visit '${visitId}' has already been decided with status '${visit.status}'.`,
        status: 409,
      },
    };
  }

  if (!isAllowedApprovalTransition(visit.status, decision.action)) {
    return {
      ok: false,
      error: {
        kind: "invalid_state",
        message: `Cannot decide visit in '${visit.status}' status.`,
        status: 422,
      },
    };
  }

  const newStatus: VisitStatus =
    decision.action === "approve" ? "APPROVED" : "REJECTED";
  const nowIso = getNow().toISOString();

  // 4. Credential arming trigger upon approval
  let credentialSyncStatus: CredentialSyncStatus | undefined =
    visit.credentialSyncStatus;
  if (newStatus === "APPROVED") {
    credentialSyncStatus = "Applied";
  }

  // 5. Upstream HikCentral synchronization (if sync adapter provided or configured via deps)
  let hikCentralSyncStatus: "synced" | "failed" | "skipped" = "skipped";
  const syncFn =
    deps.syncAdapter ??
    (deps.enableHikCentralSync ? syncApprovalToHikCentral : undefined);

  if (syncFn) {
    try {
      const syncResult = await syncFn({
        userId: approver.id,
        operateType: decision.action === "approve" ? 0 : 1,
        approvalOpinion:
          decision.comment ??
          (decision.action === "approve"
            ? "Approved by Approver"
            : "Rejected by Approver"),
      });
      hikCentralSyncStatus = syncResult.synced ? "synced" : "failed";
    } catch {
      hikCentralSyncStatus = "failed";
    }
  }

  // 6. Build immutable audit record
  const approvalRecord: ApprovalRecord = {
    id: generateId(),
    visitId: visit.id,
    action: decision.action,
    previousStatus: visit.status,
    newStatus,
    approverId: approver.id,
    approverName: approver.name,
    approverRole: approver.role,
    comment: decision.comment,
    decidedAtUtc: nowIso,
    hikCentralSyncStatus,
  };

  // 7. Persist updated Visit and approval log
  const updatedVisit = await repository.updateVisitStatusWithApproval(visit.id, {
    newStatus,
    approvalRecord,
    credentialSyncStatus,
  });

  return {
    ok: true,
    visit: updatedVisit,
    approvalRecord,
  };
}
