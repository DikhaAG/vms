import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository } from "./repository";
import type { Facility, Visit } from "./vms-contract";

describe("InMemoryVmsRepository", () => {
  let repo: InMemoryVmsRepository;

  beforeEach(() => {
    repo = new InMemoryVmsRepository();
  });

  describe("facilities", () => {
    it("has pre-seeded initial facilities across different Indonesian timezones", async () => {
      const facilities = await repo.listFacilities();
      expect(facilities.length).toBeGreaterThanOrEqual(3);

      const jakarta = await repo.getFacility("fac-jakarta");
      expect(jakarta).toBeDefined();
      expect(jakarta?.timezone).toBe("Asia/Jakarta");

      const bali = await repo.getFacility("fac-bali");
      expect(bali).toBeDefined();
      expect(bali?.timezone).toBe("Asia/Makassar");

      const jayapura = await repo.getFacility("fac-jayapura");
      expect(jayapura).toBeDefined();
      expect(jayapura?.timezone).toBe("Asia/Jayapura");
    });

    it("can save and retrieve a new facility", async () => {
      const newFacility: Facility = {
        id: "fac-surabaya",
        name: "Surabaya Hub",
        timezone: "Asia/Jakarta",
        address: "Jl. Pemuda No. 1, Surabaya",
        overstayGraceMinutes: 15,
      };
      await repo.saveFacility(newFacility);

      const retrieved = await repo.getFacility("fac-surabaya");
      expect(retrieved).toEqual(newFacility);
    });
  });

  describe("visits", () => {
    const sampleVisit: Visit = {
      id: "visit-123",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "Tanaka",
      visitorGivenName: "Kenji",
      visitorPhone: "+628111222333",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T16:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T18:00:00+07:00",
      status: "PENDING_APPROVAL",
      createdAtUtc: new Date(Date.now() - 60000).toISOString(),
      updatedAtUtc: new Date(Date.now() - 60000).toISOString(),
    };

    it("saves and retrieves a visit by id", async () => {
      await repo.saveVisit(sampleVisit);
      const retrieved = await repo.getVisit("visit-123");
      expect(retrieved).toEqual(sampleVisit);
    });

    it("lists visits filtered by facilityId", async () => {
      await repo.saveVisit(sampleVisit);
      await repo.saveVisit({
        ...sampleVisit,
        id: "visit-456",
        facilityId: "fac-bali",
      });

      const jakartaVisits = await repo.listVisits({ facilityId: "fac-jakarta" });
      expect(jakartaVisits).toHaveLength(1);
      expect(jakartaVisits[0].id).toBe("visit-123");

      const allVisits = await repo.listVisits();
      expect(allVisits).toHaveLength(2);
    });

    it("updates a visit and keeps immutable return values", async () => {
      await repo.saveVisit(sampleVisit);

      const updated = await repo.updateVisit("visit-123", {
        status: "APPROVED",
        hikCentral: {
          appointRecordId: "hik-rec-001",
          visitorId: "hik-vis-001",
          appointCode: "1234",
          qrCodeImage: "base64qrdata",
        },
      });

      expect(updated.status).toBe("APPROVED");
      expect(updated.hikCentral?.appointRecordId).toBe("hik-rec-001");
      expect(new Date(updated.updatedAtUtc).getTime()).toBeGreaterThanOrEqual(
        new Date(sampleVisit.updatedAtUtc).getTime(),
      );

      const retrieved = await repo.getVisit("visit-123");
      expect(retrieved?.status).toBe("APPROVED");
      expect(retrieved?.hikCentral?.visitorId).toBe("hik-vis-001");
    });

    it("throws when updating non-existent visit", async () => {
      await expect(
        repo.updateVisit("does-not-exist", { status: "APPROVED" }),
      ).rejects.toThrow("Visit not found");
    });
  });

  describe("invitations", () => {
    const sampleVisit: Visit = {
      id: "visit-inv-1",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "",
      visitorGivenName: "",
      visitReasonType: 3,
      scheduledStartTimeUtc: "2026-11-20T02:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-20T04:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-20T09:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-20T11:00:00+07:00",
      status: "DRAFT",
      createdAtUtc: "2026-11-13T08:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:00:00.000Z",
    };

    it("saves and retrieves invitation token", async () => {
      await repo.saveVisit(sampleVisit);
      await repo.createInvitationToken({
        token: "tok-abc-123",
        visitId: "visit-inv-1",
        expiresAtUtc: "2026-11-20T04:00:00.000Z",
        isConsumed: false,
        createdAtUtc: "2026-11-13T08:00:00.000Z",
      });

      const tokenRecord = await repo.getInvitationToken("tok-abc-123");
      expect(tokenRecord).toBeDefined();
      expect(tokenRecord?.token).toBe("tok-abc-123");
      expect(tokenRecord?.isConsumed).toBe(false);
    });

    it("retrieves visit and token by invitation token", async () => {
      await repo.saveVisit(sampleVisit);
      await repo.createInvitationToken({
        token: "tok-abc-123",
        visitId: "visit-inv-1",
        expiresAtUtc: "2026-11-20T04:00:00.000Z",
        isConsumed: false,
        createdAtUtc: "2026-11-13T08:00:00.000Z",
      });

      const result = await repo.getVisitByInvitationToken("tok-abc-123");
      expect(result).toBeDefined();
      expect(result?.visit.id).toBe("visit-inv-1");
      expect(result?.token.token).toBe("tok-abc-123");
    });

    it("returns undefined for unknown invitation token", async () => {
      const result = await repo.getVisitByInvitationToken("non-existent");
      expect(result).toBeUndefined();
    });

    it("consumes an invitation token and records consumption timestamp", async () => {
      await repo.saveVisit(sampleVisit);
      await repo.createInvitationToken({
        token: "tok-to-consume",
        visitId: "visit-inv-1",
        expiresAtUtc: "2026-11-20T04:00:00.000Z",
        isConsumed: false,
        createdAtUtc: "2026-11-13T08:00:00.000Z",
      });

      const consumed = await repo.consumeInvitationToken("tok-to-consume");
      expect(consumed.isConsumed).toBe(true);
      expect(consumed.consumedAtUtc).toBeDefined();

      // Second consumption should throw
      await expect(
        repo.consumeInvitationToken("tok-to-consume"),
      ).rejects.toThrow("already consumed");
    });
  });

  describe("approvals and status queries", () => {
    const pendingVisit1: Visit = {
      id: "vis-p1",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "Aditya",
      visitorGivenName: "Budi",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-13T10:00:00Z",
      scheduledEndTimeUtc: "2026-11-13T12:00:00Z",
      scheduledStartTimeFacility: "2026-11-13T17:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T19:00:00+07:00",
      status: "PENDING_APPROVAL",
      createdAtUtc: "2026-11-13T09:00:00Z",
      updatedAtUtc: "2026-11-13T09:00:00Z",
    };

    const escalatedVisit: Visit = {
      id: "vis-esc",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "Blacklisted",
      visitorGivenName: "John",
      certificateType: 111,
      certificateNo: "FLAGGED-999",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-13T10:00:00Z",
      scheduledEndTimeUtc: "2026-11-13T12:00:00Z",
      scheduledStartTimeFacility: "2026-11-13T17:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T19:00:00+07:00",
      status: "SECURITY_ESCALATED",
      monitoringListFlag: {
        isFlagged: true,
        flaggedAtUtc: "2026-11-13T09:05:00Z",
        reason: "Matched facility denial list",
      },
      createdAtUtc: "2026-11-13T09:05:00Z",
      updatedAtUtc: "2026-11-13T09:05:00Z",
    };

    const approvedVisit: Visit = {
      ...pendingVisit1,
      id: "vis-app1",
      status: "APPROVED",
      facilityId: "fac-bali",
    };

    it("retrieves visits filtered by a single status or multiple statuses", async () => {
      await repo.saveVisit(pendingVisit1);
      await repo.saveVisit(escalatedVisit);
      await repo.saveVisit(approvedVisit);

      const pendingOnly = await repo.getVisitsByStatus("PENDING_APPROVAL");
      expect(pendingOnly).toHaveLength(1);
      expect(pendingOnly[0].id).toBe("vis-p1");

      const reviewQueue = await repo.getVisitsByStatus([
        "PENDING_APPROVAL",
        "SECURITY_ESCALATED",
      ]);
      expect(reviewQueue).toHaveLength(2);
      expect(reviewQueue.map((v) => v.id)).toContain("vis-p1");
      expect(reviewQueue.map((v) => v.id)).toContain("vis-esc");

      // Filter by facility as well
      const baliQueue = await repo.getVisitsByStatus(
        ["PENDING_APPROVAL", "APPROVED"],
        "fac-bali",
      );
      expect(baliQueue).toHaveLength(1);
      expect(baliQueue[0].id).toBe("vis-app1");
    });

    it("saves and lists approval audit records for visits", async () => {
      await repo.saveVisit(pendingVisit1);

      const approvalRecord = {
        id: "app-rec-001",
        visitId: "vis-p1",
        action: "approve" as const,
        previousStatus: "PENDING_APPROVAL" as const,
        newStatus: "APPROVED" as const,
        approverId: "mgr-007",
        approverName: "Sarah Connor",
        approverRole: "Department Manager",
        comment: "Authorized for client session.",
        decidedAtUtc: "2026-11-13T09:30:00Z",
        hikCentralSyncStatus: "synced" as const,
      };

      await repo.saveApprovalRecord(approvalRecord);

      const recordsForVisit = await repo.listApprovalRecords("vis-p1");
      expect(recordsForVisit).toHaveLength(1);
      expect(recordsForVisit[0].approverName).toBe("Sarah Connor");
      expect(recordsForVisit[0].action).toBe("approve");

      const allRecords = await repo.listApprovalRecords();
      expect(allRecords).toHaveLength(1);
    });

    it("updates visit status with approval record atomically", async () => {
      await repo.saveVisit(pendingVisit1);

      const approvalRecord = {
        id: "app-rec-002",
        visitId: "vis-p1",
        action: "approve" as const,
        previousStatus: "PENDING_APPROVAL" as const,
        newStatus: "APPROVED" as const,
        approverId: "mgr-007",
        approverName: "Sarah Connor",
        decidedAtUtc: "2026-11-13T09:35:00Z",
      };

      const updated = await repo.updateVisitStatusWithApproval("vis-p1", {
        newStatus: "APPROVED",
        approvalRecord,
        credentialSyncStatus: "Applied",
      });

      expect(updated.status).toBe("APPROVED");
      expect(updated.credentialSyncStatus).toBe("Applied");
      expect(updated.approvalRecord?.id).toBe("app-rec-002");

      const retrieved = await repo.getVisit("vis-p1");
      expect(retrieved?.status).toBe("APPROVED");
      expect(retrieved?.approvalRecord?.approverName).toBe("Sarah Connor");

      const logs = await repo.listApprovalRecords("vis-p1");
      expect(logs).toHaveLength(1);
      expect(logs[0].id).toBe("app-rec-002");
    });
  });
});
