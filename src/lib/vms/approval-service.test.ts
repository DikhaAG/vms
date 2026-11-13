import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository } from "./repository";
import {
  decideApproval,
  listPendingApprovals,
} from "./approval-service";
import type { Visit } from "./vms-contract";
import type { ApproverUser } from "./approval-contract";
import type { SyncApprovalParams, SyncApprovalResult } from "./hikcentral-approval-adapter";

describe("Approval Service", () => {
  let repository: InMemoryVmsRepository;

  const mockApprover: ApproverUser = {
    id: "usr-mgr-01",
    name: "Alex Tan",
    role: "Department Manager",
    email: "alex.tan@example.com",
  };

  const samplePendingVisit: Visit = {
    id: "vis-pending-1",
    facilityId: "fac-jakarta",
    facilityName: "Jakarta Corporate HQ",
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitorFamilyName: "Pratama",
    visitorGivenName: "Rian",
    visitorPhone: "+628123456789",
    certificateType: 111,
    certificateNo: "3171012345670001",
    visitReasonType: 3,
    scheduledStartTimeUtc: "2026-11-13T03:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T05:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T10:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T12:00:00+07:00",
    status: "PENDING_APPROVAL",
    credentialSyncStatus: "Applied",
    createdAtUtc: "2026-11-13T02:00:00Z",
    updatedAtUtc: "2026-11-13T02:00:00Z",
  };

  const sampleEscalatedVisit: Visit = {
    id: "vis-escalated-1",
    facilityId: "fac-jakarta",
    facilityName: "Jakarta Corporate HQ",
    visitorFamilyName: "Blacklisted",
    visitorGivenName: "Mark",
    certificateType: 111,
    certificateNo: "FLAGGED-9999",
    visitReasonType: 0,
    scheduledStartTimeUtc: "2026-11-13T04:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T11:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
    status: "SECURITY_ESCALATED",
    monitoringListFlag: {
      isFlagged: true,
      flaggedAtUtc: "2026-11-13T02:30:00Z",
      reason: "Individual flagged on high-risk monitoring list",
    },
    createdAtUtc: "2026-11-13T02:30:00Z",
    updatedAtUtc: "2026-11-13T02:30:00Z",
  };

  beforeEach(() => {
    repository = new InMemoryVmsRepository();
  });

  describe("listPendingApprovals", () => {
    it("returns both pending and security-escalated visits across facilities", async () => {
      await repository.saveVisit(samplePendingVisit);
      await repository.saveVisit(sampleEscalatedVisit);
      await repository.saveVisit({
        ...samplePendingVisit,
        id: "vis-approved-1",
        status: "APPROVED",
      });

      const result = await listPendingApprovals(undefined, { repository });
      expect(result.totalCount).toBe(2);
      expect(result.pendingVisits).toHaveLength(1);
      expect(result.escalatedVisits).toHaveLength(1);
      expect(result.allVisits).toHaveLength(2);
      expect(result.pendingVisits[0].id).toBe("vis-pending-1");
      expect(result.escalatedVisits[0].id).toBe("vis-escalated-1");
    });

    it("filters pending visits by facilityId", async () => {
      await repository.saveVisit(samplePendingVisit);
      await repository.saveVisit({
        ...samplePendingVisit,
        id: "vis-bali-1",
        facilityId: "fac-bali",
      });

      const jakartaResults = await listPendingApprovals("fac-jakarta", { repository });
      expect(jakartaResults.totalCount).toBe(1);
      expect(jakartaResults.allVisits[0].facilityId).toBe("fac-jakarta");
    });
  });

  describe("decideApproval", () => {
    it("approves a pending visit, transitions status to APPROVED, and emits audit log", async () => {
      await repository.saveVisit(samplePendingVisit);

      let syncedParams: SyncApprovalParams | undefined;
      const mockSync = async (params: SyncApprovalParams): Promise<SyncApprovalResult> => {
        syncedParams = params;
        return { success: true, synced: true };
      };

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "approve",
          comment: "Approved for business meeting in 4th floor conference room.",
        },
        mockApprover,
        { repository, syncAdapter: mockSync },
      );

      expect(result.ok).toBe(true);
      expect(result.visit).toBeDefined();
      expect(result.visit?.status).toBe("APPROVED");
      expect(result.visit?.credentialSyncStatus).toBe("Applied");
      expect(result.approvalRecord).toBeDefined();
      expect(result.approvalRecord?.action).toBe("approve");
      expect(result.approvalRecord?.previousStatus).toBe("PENDING_APPROVAL");
      expect(result.approvalRecord?.newStatus).toBe("APPROVED");
      expect(result.approvalRecord?.approverId).toBe("usr-mgr-01");
      expect(result.approvalRecord?.hikCentralSyncStatus).toBe("synced");

      expect(syncedParams?.operateType).toBe(0);
      expect(syncedParams?.approvalOpinion).toContain("Approved for business meeting");

      // Verify repository updated
      const stored = await repository.getVisit("vis-pending-1");
      expect(stored?.status).toBe("APPROVED");
      expect(stored?.approvalRecord?.action).toBe("approve");

      // Verify audit logs
      const logs = await repository.listApprovalRecords("vis-pending-1");
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("approve");
    });

    it("rejects a pending visit with required comment and transitions to REJECTED", async () => {
      await repository.saveVisit(samplePendingVisit);

      let syncedParams: SyncApprovalParams | undefined;
      const mockSync = async (params: SyncApprovalParams): Promise<SyncApprovalResult> => {
        syncedParams = params;
        return { success: true, synced: true };
      };

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "reject",
          comment: "Host is traveling abroad; visit denied.",
        },
        mockApprover,
        { repository, syncAdapter: mockSync },
      );

      expect(result.ok).toBe(true);
      expect(result.visit?.status).toBe("REJECTED");
      expect(result.approvalRecord?.action).toBe("reject");
      expect(result.approvalRecord?.comment).toBe("Host is traveling abroad; visit denied.");

      expect(syncedParams?.operateType).toBe(1);
    });

    it("allows Security Officer to review and reject a SECURITY_ESCALATED visit", async () => {
      await repository.saveVisit(sampleEscalatedVisit);

      const securityApprover: ApproverUser = {
        id: "usr-sec-01",
        name: "Chief Security Officer",
        role: "Security Officer",
      };

      const result = await decideApproval(
        "vis-escalated-1",
        {
          action: "reject",
          comment: "Individual confirmed on prohibited entry list by corporate security.",
        },
        securityApprover,
        { repository },
      );

      expect(result.ok).toBe(true);
      expect(result.visit?.status).toBe("REJECTED");
      expect(result.approvalRecord?.previousStatus).toBe("SECURITY_ESCALATED");
      expect(result.approvalRecord?.approverRole).toBe("Security Officer");
    });

    it("allows Security Officer to override and approve a SECURITY_ESCALATED visit with comment", async () => {
      await repository.saveVisit(sampleEscalatedVisit);

      const result = await decideApproval(
        "vis-escalated-1",
        {
          action: "approve",
          comment: "Identity verified manually with legal department clearance.",
        },
        mockApprover,
        { repository },
      );

      expect(result.ok).toBe(true);
      expect(result.visit?.status).toBe("APPROVED");
      expect(result.approvalRecord?.previousStatus).toBe("SECURITY_ESCALATED");
    });

    it("fails with validation error when reject action lacks a comment", async () => {
      await repository.saveVisit(samplePendingVisit);

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "reject",
          comment: "",
        },
        mockApprover,
        { repository },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("validation");
      expect(result.error?.fieldErrors?.comment).toBeDefined();
    });

    it("returns conflict error when visit is already decided (APPROVED)", async () => {
      await repository.saveVisit({
        ...samplePendingVisit,
        status: "APPROVED",
      });

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "approve",
          comment: "Second approval attempt",
        },
        mockApprover,
        { repository },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("conflict");
      expect(result.error?.message).toMatch(/already been decided/i);
    });

    it("returns conflict error when visit is already decided (REJECTED)", async () => {
      await repository.saveVisit({
        ...samplePendingVisit,
        status: "REJECTED",
      });

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "reject",
          comment: "Attempting to reject again",
        },
        mockApprover,
        { repository },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("conflict");
    });

    it("returns invalid_state error for visits in CHECKED_IN or DRAFT status", async () => {
      await repository.saveVisit({
        ...samplePendingVisit,
        status: "CHECKED_IN",
      });

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "approve",
        },
        mockApprover,
        { repository },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("invalid_state");
    });

    it("returns not_found error when visit does not exist", async () => {
      const result = await decideApproval(
        "non-existent-id",
        {
          action: "approve",
        },
        mockApprover,
        { repository },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("not_found");
    });

    it("records hikCentralSyncStatus as skipped if sync fails or is not enabled", async () => {
      await repository.saveVisit(samplePendingVisit);

      const mockFailingSync = async (): Promise<SyncApprovalResult> => ({
        success: false,
        synced: false,
        error: "HikCentral connection timed out",
      });

      const result = await decideApproval(
        "vis-pending-1",
        {
          action: "approve",
        },
        mockApprover,
        { repository, syncAdapter: mockFailingSync },
      );

      expect(result.ok).toBe(true);
      expect(result.approvalRecord?.hikCentralSyncStatus).toBe("failed");
    });
  });
});
