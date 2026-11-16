import { beforeEach, describe, expect, it } from "vitest";
import {
  createVmsRepository,
  InMemoryVmsRepository,
  PostgresVmsRepository,
  DEFAULT_DOORS,
  TEST_FIXTURE_DOORS,
  DEFAULT_ACCESS_LEVELS,
  TEST_FIXTURE_ACCESS_LEVELS,
} from "./repository";
import type { Visit, EmergencyAccessGrant } from "./vms-contract";

describe("InMemoryVmsRepository", () => {
  let repo: InMemoryVmsRepository;

  beforeEach(() => {
    repo = new InMemoryVmsRepository();
  });

  describe("systemSettings", () => {
    it("returns default singleton settings on initial repository instantiation", async () => {
      const settings = await repo.getSettings();
      expect(settings).toBeDefined();
      expect(settings.id).toBe("default");
      expect(settings.timezone).toBe("Asia/Jakarta");
      expect(settings.overstayGraceMinutes).toBe(15);
      expect(settings.autoCheckInEarlyBufferMinutes).toBe(15);
      expect(settings.updatedAt).toBeDefined();
    });

    it("updates system settings partially and preserves untouched fields", async () => {
      const updated = await repo.updateSettings({
        timezone: "Asia/Makassar",
        overstayGraceMinutes: 30,
      });

      expect(updated.timezone).toBe("Asia/Makassar");
      expect(updated.overstayGraceMinutes).toBe(30);
      expect(updated.autoCheckInEarlyBufferMinutes).toBe(15);

      const refreshed = await repo.getSettings();
      expect(refreshed.timezone).toBe("Asia/Makassar");
      expect(refreshed.overstayGraceMinutes).toBe(30);
      expect(refreshed.autoCheckInEarlyBufferMinutes).toBe(15);
    });

    it("instantiates repository with custom initial system settings", async () => {
      const customRepo = new InMemoryVmsRepository(
        undefined,
        undefined,
        undefined,
        undefined,
        {
          id: "default",
          siteName: "Gedung Utama",
          timezone: "Asia/Jayapura",
          overstayGraceMinutes: 45,
          autoCheckInEarlyBufferMinutes: 20,
          updatedAt: "2026-11-15T00:00:00Z",
        },
      );

      const settings = await customRepo.getSettings();
      expect(settings.timezone).toBe("Asia/Jayapura");
      expect(settings.overstayGraceMinutes).toBe(45);
      expect(settings.autoCheckInEarlyBufferMinutes).toBe(20);
    });
  });

  describe("visits", () => {
    const sampleVisit: Visit = {
      id: "visit-123",
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

    it("lists all saved visits", async () => {
      await repo.saveVisit(sampleVisit);
      await repo.saveVisit({
        ...sampleVisit,
        id: "visit-456",
      });

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

  describe("flat access levels (Ticket 03)", () => {
    it("fresh boot starts empty (DEFAULT_ACCESS_LEVELS = []), eliminating hardcoded demo levels", async () => {
      expect(DEFAULT_ACCESS_LEVELS).toEqual([]);
      const levels = await repo.listAccessLevels();
      expect(levels).toEqual([]);
    });

    it("populates and retrieves flat access levels across building", async () => {
      await repo.saveAccessLevels(TEST_FIXTURE_ACCESS_LEVELS);
      const allLevels = await repo.listAccessLevels();
      expect(allLevels.length).toBeGreaterThanOrEqual(3);
      expect(allLevels.some((l) => l.name.includes("Lobby"))).toBe(true);
      expect(allLevels.some((l) => l.isDefault)).toBe(true);
    });

    it("can save, retrieve, update, and delete flat access levels without facilityId", async () => {
      const flatLevel = {
        id: "acc-flat-1",
        name: "Building Perimeter All Gates",
        description: "Standard ground floor turnstile and perimeter gate access",
        doors: ["Lobby Main SpeedGate A", "Visitor Turnstile 01"],
        floors: ["1F"],
        timeScheduleId: 2 as const,
        isDefault: true,
      };

      await repo.saveAccessLevel(flatLevel);
      const retrieved = await repo.getAccessLevel("acc-flat-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Building Perimeter All Gates");
      expect(retrieved?.doors).toEqual(["Lobby Main SpeedGate A", "Visitor Turnstile 01"]);

      // Update
      await repo.saveAccessLevel({
        ...flatLevel,
        name: "Building Perimeter Updated",
      });
      const updated = await repo.getAccessLevel("acc-flat-1");
      expect(updated?.name).toBe("Building Perimeter Updated");

      // Delete
      await repo.deleteAccessLevel("acc-flat-1");
      const deleted = await repo.getAccessLevel("acc-flat-1");
      expect(deleted).toBeUndefined();
    });
  });

  describe("searchVisits and checkInVisit", () => {
    const visit1: Visit = {
      id: "vis-search-01",
      visitorFamilyName: "Santoso",
      visitorGivenName: "Budi",
      visitorPhone: "+62812345678",
      visitorEmail: "budi.santoso@example.com",
      certificateType: 111,
      certificateNo: "3171010101010001",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-13T02:00:00Z",
      scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
      scheduledStartTimeFacility: "2026-11-13T09:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
      status: "APPROVED",
      hikCentral: {
        appointRecordId: "rec-hc-01",
        visitorId: "hc-vis-01",
        appointCode: "8899",
      },
      createdAtUtc: "2026-11-13T01:00:00Z",
      updatedAtUtc: "2026-11-13T01:00:00Z",
    };

    const visit2: Visit = {
      id: "vis-search-02",
      visitorFamilyName: "Wulandari",
      visitorGivenName: "Siti",
      visitorPhone: "+62819876543",
      visitorEmail: "siti.wulan@example.com",
      certificateType: 414,
      certificateNo: "X12345678",
      visitReasonType: 1,
      scheduledStartTimeUtc: "2026-11-13T03:00:00Z",
      scheduledEndTimeUtc: "2026-11-13T07:00:00Z",
      scheduledStartTimeFacility: "2026-11-13T11:00:00+08:00",
      scheduledEndTimeFacility: "2026-11-13T15:00:00+08:00",
      status: "CHECKED_IN",
      invitationToken: "tok-inv-bali-01",
      createdAtUtc: "2026-11-13T01:00:00Z",
      updatedAtUtc: "2026-11-13T01:00:00Z",
    };

    beforeEach(async () => {
      await repo.saveVisit(visit1);
      await repo.saveVisit(visit2);
    });

    it("searches visits by visitor given/family name or full name case-insensitively", async () => {
      const matchGiven = await repo.searchVisits("budi");
      expect(matchGiven).toHaveLength(1);
      expect(matchGiven[0].id).toBe("vis-search-01");

      const matchFamily = await repo.searchVisits("WULANDARI");
      expect(matchFamily).toHaveLength(1);
      expect(matchFamily[0].id).toBe("vis-search-02");

      const matchFull = await repo.searchVisits("Budi Santoso");
      expect(matchFull).toHaveLength(1);
      expect(matchFull[0].id).toBe("vis-search-01");
    });

    it("searches visits by phone number, email, certificateNo, appointment code, id, or token", async () => {
      const matchPhone = await repo.searchVisits("+62812345");
      expect(matchPhone).toHaveLength(1);
      expect(matchPhone[0].id).toBe("vis-search-01");

      const matchCert = await repo.searchVisits("X12345678");
      expect(matchCert).toHaveLength(1);
      expect(matchCert[0].id).toBe("vis-search-02");

      const matchCode = await repo.searchVisits("8899");
      expect(matchCode).toHaveLength(1);
      expect(matchCode[0].id).toBe("vis-search-01");

      const matchToken = await repo.searchVisits("tok-inv-bali-01");
      expect(matchToken).toHaveLength(1);
      expect(matchToken[0].id).toBe("vis-search-02");

      const matchId = await repo.searchVisits("vis-search-01");
      expect(matchId).toHaveLength(1);
      expect(matchId[0].id).toBe("vis-search-01");
    });

    it("filters search results by status", async () => {
      const matchesApproved = await repo.searchVisits("", "APPROVED");
      expect(matchesApproved).toHaveLength(1);
      expect(matchesApproved[0].id).toBe("vis-search-01");

      const matchesStatusArray = await repo.searchVisits("", [
        "APPROVED",
        "CHECKED_IN",
      ]);
      expect(matchesStatusArray).toHaveLength(2);
    });

    it("checks in a visit, transitions status to CHECKED_IN, updates actualCheckInTimeUtc and audit log", async () => {
      const updated = await repo.checkInVisit("vis-search-01", {
        actualCheckInTimeUtc: "2026-11-13T02:05:00Z",
        receptionistUserId: "rec-user-01",
        receptionistName: "Dewi Frontdesk",
        verificationMethod: "qr",
        hikCentral: {
          appointRecordId: "rec-hc-01-updated",
          visitorId: "hc-vis-01",
          appointCode: "8899",
          qrCodeImage: "qr-data-updated",
          pinCode: "123456",
        },
        credentialSyncStatus: "Applied",
        notes: "Identity verified with physical passport",
      });

      expect(updated.status).toBe("CHECKED_IN");
      expect(updated.actualCheckInTimeUtc).toBe("2026-11-13T02:05:00Z");
      expect(updated.hikCentral?.appointRecordId).toBe("rec-hc-01-updated");
      expect(updated.hikCentral?.pinCode).toBe("123456");
      expect(updated.credentialSyncStatus).toBe("Applied");

      // Verify audit event persisted
      const events = await repo.listCheckInEvents("vis-search-01");
      expect(events).toHaveLength(1);
      expect(events[0].receptionistUserId).toBe("rec-user-01");
      expect(events[0].verificationMethod).toBe("qr");
      expect(events[0].checkedInAtUtc).toBe("2026-11-13T02:05:00Z");
    });

    it("throws when checking in a non-existent visit", async () => {
      await expect(
        repo.checkInVisit("non-existent-id", {
          actualCheckInTimeUtc: "2026-11-13T02:00:00Z",
          receptionistUserId: "rec-user-01",
          verificationMethod: "manual",
        }),
      ).rejects.toThrow("Visit not found");
    });
  });

  describe("active monitoring and check-out", () => {
    beforeEach(async () => {
      // Seed visits in different statuses
      await repo.saveVisit({
        id: "vis-act-1",
        visitorGivenName: "Alice",
        visitorFamilyName: "Smith",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
        actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
        status: "CHECKED_IN",
        tapCount: 1,
        hikCentral: {
          appointRecordId: "hc-rec-1",
          visitorId: "hc-vis-1",
        },
        createdAtUtc: "2026-11-13T07:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:05:00.000Z",
      });

      await repo.saveVisit({
        id: "vis-act-2",
        visitorGivenName: "Bob",
        visitorFamilyName: "Jones",
        visitReasonType: 2,
        scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T17:00:00+08:00",
        scheduledEndTimeFacility: "2026-11-13T19:00:00+08:00",
        actualCheckInTimeUtc: "2026-11-13T09:02:00.000Z",
        status: "CHECKED_IN",
        createdAtUtc: "2026-11-13T08:00:00.000Z",
        updatedAtUtc: "2026-11-13T09:02:00.000Z",
      });

      await repo.saveVisit({
        id: "vis-act-3",
        visitorGivenName: "Charlie",
        visitorFamilyName: "Brown",
        visitReasonType: 1,
        scheduledStartTimeUtc: "2026-11-13T07:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T08:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T14:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T15:00:00+07:00",
        actualCheckInTimeUtc: "2026-11-13T07:05:00.000Z",
        actualCheckOutTimeUtc: "2026-11-13T08:00:00.000Z",
        status: "CHECKED_OUT",
        createdAtUtc: "2026-11-13T06:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:00:00.000Z",
      });
    });

    it("listActiveVisits returns only visits with status CHECKED_IN", async () => {
      const active = await repo.listActiveVisits();
      expect(active).toHaveLength(2);
      expect(active.map((v) => v.id).sort()).toEqual(["vis-act-1", "vis-act-2"]);
    });

    it("recordDoorTap persists tap event and increments visit's tapCount", async () => {
      const result = await repo.recordDoorTap({
        visitId: "vis-act-1",
        doorIndexCode: "door-gate-1",
        doorName: "Main Entrance SpeedGate",
        direction: "in",
        tappedAtUtc: "2026-11-13T08:30:00.000Z",
      });

      expect(result.tapCount).toBe(2);
      expect(result.visit.tapCount).toBe(2);
      expect(result.event.id).toBeDefined();

      const events = await repo.listDoorTapEvents("vis-act-1");
      expect(events).toHaveLength(1);
      expect(events[0].doorIndexCode).toBe("door-gate-1");

      const updatedVisit = await repo.getVisit("vis-act-1");
      expect(updatedVisit?.tapCount).toBe(2);
    });

    it("checkOutVisit transitions status to CHECKED_OUT and logs check-out audit event", async () => {
      const updated = await repo.checkOutVisit("vis-act-1", {
        actualCheckOutTimeUtc: "2026-11-13T09:45:00.000Z",
        operatorUserId: "usr-sec-99",
        operatorName: "Officer Herman",
        reason: "Visit concluded normally",
        isForced: false,
        appointRecordIdRevoked: "hc-rec-1",
      });

      expect(updated.status).toBe("CHECKED_OUT");
      expect(updated.actualCheckOutTimeUtc).toBe("2026-11-13T09:45:00.000Z");
      expect(updated.checkOutReason).toBe("Visit concluded normally");
      expect(updated.isForcedCheckOut).toBe(false);
      expect(updated.checkedOutByUserId).toBe("usr-sec-99");

      // Verify no longer in listActiveVisits
      const active = await repo.listActiveVisits();
      expect(active.find((v) => v.id === "vis-act-1")).toBeUndefined();

      // Verify check-out audit event
      const logs = await repo.listCheckOutEvents("vis-act-1");
      expect(logs).toHaveLength(1);
      expect(logs[0].operatorUserId).toBe("usr-sec-99");
      expect(logs[0].appointRecordIdRevoked).toBe("hc-rec-1");
    });

    it("throws when checking out non-existent visit", async () => {
      await expect(
        repo.checkOutVisit("non-existent-id", {
          actualCheckOutTimeUtc: "2026-11-13T10:00:00Z",
          operatorUserId: "usr-1",
          isForced: false,
        }),
      ).rejects.toThrow("Visit not found");
    });
  });

  describe("group visits & visitor profiles (Ticket 08)", () => {
    const sampleProfile = {
      id: "prof-001",
      certificateType: 111 as const,
      certificateNo: "3171012345670001",
      fullName: "Kenji Tanaka",
      familyName: "Tanaka",
      givenName: "Kenji",
      phone: "+628111222333",
      email: "kenji@example.com",
      facePhoto: "data:image/jpeg;base64,sample-photo",
      isDeleted: false,
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    };

    it("saves and finds a visitor profile by certificate number", async () => {
      await repo.saveVisitorProfile(sampleProfile);

      const found = await repo.findVisitorProfileByCertificate(
        "3171012345670001",
      );
      expect(found).toBeDefined();
      expect(found?.fullName).toBe("Kenji Tanaka");
      expect(found?.isDeleted).toBe(false);
    });

    it("does not return soft-deleted profile from findVisitorProfileByCertificate", async () => {
      await repo.saveVisitorProfile(sampleProfile);
      await repo.softDeleteVisitorProfile(
        "prof-001",
        true,
        "User PDP erasure request",
      );

      const found = await repo.findVisitorProfileByCertificate(
        "3171012345670001",
      );
      expect(found).toBeUndefined();
    });

    it("softDeleteVisitorProfile toggles isDeleted flag and records deletion details", async () => {
      await repo.saveVisitorProfile(sampleProfile);

      const archived = await repo.softDeleteVisitorProfile(
        "prof-001",
        true,
        "Personal data erasure",
      );
      expect(archived.isDeleted).toBe(true);
      expect(archived.deletionReason).toBe("Personal data erasure");
      expect(archived.deletedAtUtc).toBeDefined();

      const restored = await repo.softDeleteVisitorProfile("prof-001", false);
      expect(restored.isDeleted).toBe(false);
      expect(restored.deletionReason).toBeUndefined();
      expect(restored.deletedAtUtc).toBeUndefined();
    });

    it("listVisitorProfiles filters by active status, search query, and computes visitCount", async () => {
      await repo.saveVisitorProfile(sampleProfile);
      await repo.saveVisitorProfile({
        id: "prof-002",
        certificateType: 414,
        certificateNo: "USA99988877",
        fullName: "Sarah Connor",
        familyName: "Connor",
        givenName: "Sarah",
        phone: "+12125550199",
        isDeleted: true,
        createdAtUtc: "2026-11-11T08:00:00.000Z",
        updatedAtUtc: "2026-11-11T08:00:00.000Z",
      });

      // Save a visit matching sampleProfile
      await repo.saveVisit({
        id: "vis-grp-mem-1",
        visitorFamilyName: "Tanaka",
        visitorGivenName: "Kenji",
        certificateNo: "3171012345670001",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T16:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T18:00:00+07:00",
        status: "APPROVED",
        createdAtUtc: "2026-11-13T08:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:00:00.000Z",
      });

      // By default, list excludes deleted profiles
      const activeOnly = await repo.listVisitorProfiles();
      expect(activeOnly.some((p) => p.id === "prof-001")).toBe(true);
      expect(activeOnly.some((p) => p.id === "prof-002")).toBe(false);

      const kenjiProfile = activeOnly.find((p) => p.id === "prof-001");
      expect(kenjiProfile?.visitCount).toBe(1);

      // With includeDeleted: true
      const allProfiles = await repo.listVisitorProfiles({
        includeDeleted: true,
      });
      expect(allProfiles.some((p) => p.id === "prof-002")).toBe(true);

      // With query
      const searchResult = await repo.listVisitorProfiles({
        query: "Sarah",
        includeDeleted: true,
      });
      expect(searchResult).toHaveLength(1);
      expect(searchResult[0].id).toBe("prof-002");
    });

    it("listVisitsByGroup returns all visits belonging to a group", async () => {
      await repo.saveVisit({
        id: "vis-g1",
        groupId: "grp-abc",
        visitorGroupName: "Vendor Team",
        visitorFamilyName: "A",
        visitorGivenName: "Alpha",
        visitReasonType: 1,
        scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T16:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T18:00:00+07:00",
        status: "APPROVED",
        createdAtUtc: "2026-11-13T08:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:00:00.000Z",
      });

      await repo.saveVisit({
        id: "vis-g2",
        groupId: "grp-abc",
        visitorGroupName: "Vendor Team",
        visitorFamilyName: "B",
        visitorGivenName: "Beta",
        visitReasonType: 1,
        scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T16:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T18:00:00+07:00",
        status: "APPROVED",
        createdAtUtc: "2026-11-13T08:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:00:00.000Z",
      });

      const groupVisits = await repo.listVisitsByGroup("grp-abc");
      expect(groupVisits).toHaveLength(2);
      expect(groupVisits.map((v) => v.id)).toContain("vis-g1");
      expect(groupVisits.map((v) => v.id)).toContain("vis-g2");
    });
  });

  describe("host directory", () => {
    it("manages host directory with saveHost, listHosts, and getHost", async () => {
      await repo.saveHost({
        id: "emp-999",
        name: "John Doe",
        email: "john@example.com",
      });

      const retrieved = await repo.getHost("emp-999");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("John Doe");

      const queried = await repo.listHosts("john");
      expect(queried).toHaveLength(1);
      expect(queried[0].id).toBe("emp-999");
    });
  });

  describe("door topology metadata operations (Ticket 01)", () => {
    it("fresh boot starts empty (DEFAULT_DOORS = []), eliminating hardcoded demo doors", async () => {
      expect(DEFAULT_DOORS).toEqual([]);
      const doors = await repo.listDoors();
      expect(doors).toEqual([]);
    });

    it("lists every door flatly across the single site with no facility scoping", async () => {
      await repo.saveDoors(TEST_FIXTURE_DOORS);
      const doors = await repo.listDoors();
      expect(doors).toHaveLength(TEST_FIXTURE_DOORS.length);
      expect(doors.every((d) => !("facilityId" in d))).toBe(true);

      const dcRoom = doors.find((d) => d.doorIndexCode === "door-jkt-dc-01");
      expect(dcRoom).toBeDefined();
      expect(dcRoom?.accessType).toBe("SINGLE_DIRECTION_IN");
      expect(dcRoom?.isPerimeter).toBe(false);

      const turnstile = doors.find((d) => d.doorIndexCode === "door-turnstile-1");
      expect(turnstile).toBeDefined();
      expect(turnstile?.accessType).toBe("DUAL_DIRECTION");
      expect(turnstile?.isPerimeter).toBe(true);
    });

    it("getDoor retrieves door by doorIndexCode", async () => {
      await repo.saveDoors(TEST_FIXTURE_DOORS);
      const door = await repo.getDoor("door-turnstile-1");
      expect(door).toBeDefined();
      expect(door?.doorName).toBe("Lobby Main SpeedGate A");
      expect(door?.accessType).toBe("DUAL_DIRECTION");
      expect(door?.isPerimeter).toBe(true);

      const unknown = await repo.getDoor("non-existent-door");
      expect(unknown).toBeUndefined();
    });

    it("getDoorByName retrieves door case-insensitively across the site", async () => {
      await repo.saveDoors(TEST_FIXTURE_DOORS);
      const door = await repo.getDoorByName("dc server room 01");
      expect(door).toBeDefined();
      expect(door?.doorIndexCode).toBe("door-jkt-dc-01");
      expect(door?.accessType).toBe("SINGLE_DIRECTION_IN");

      const unknown = await repo.getDoorByName("No Such Door");
      expect(unknown).toBeUndefined();
    });

    it("findDoor resolves by either doorIndexCode or doorName", async () => {
      await repo.saveDoors(TEST_FIXTURE_DOORS);
      const byCode = await repo.findDoor("door-jkt-dc-01");
      expect(byCode).toBeDefined();
      expect(byCode?.doorName).toBe("DC Server Room 01");

      const byName = await repo.findDoor("DC Server Room 01");
      expect(byName).toBeDefined();
      expect(byName?.doorIndexCode).toBe("door-jkt-dc-01");
    });

    it("saveDoor and saveDoors persist new doors and updates", async () => {
      await repo.saveDoor({
        id: "door-custom-1",
        doorIndexCode: "door-lab-99",
        doorName: "Secret AI Lab",
        accessType: "SINGLE_DIRECTION_IN",
        isPerimeter: false,
        roomTimeoutMinutes: 30,
      });

      const retrieved = await repo.getDoor("door-lab-99");
      expect(retrieved).toBeDefined();
      expect(retrieved?.doorName).toBe("Secret AI Lab");
      expect(retrieved?.accessType).toBe("SINGLE_DIRECTION_IN");

      await repo.saveDoors([
        {
          id: "door-custom-2",
          doorIndexCode: "door-pool-1",
          doorName: "Pool Access",
          accessType: "DUAL_DIRECTION",
          isPerimeter: true,
        },
      ]);

      const poolDoor = await repo.getDoor("door-pool-1");
      expect(poolDoor).toBeDefined();
      expect(poolDoor?.doorName).toBe("Pool Access");
    });

    it("recordDoorTap enriches metadata, sets inAndOutType, updates lastSeenDoor, and handles implicit taps", async () => {
      await repo.saveDoors(TEST_FIXTURE_DOORS);
      await repo.saveVisit({
        id: "vis-topo-1",
        visitorGivenName: "Alice",
        visitorFamilyName: "Smith",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
        actualCheckInTimeUtc: "2026-11-13T08:02:00.000Z",
        status: "CHECKED_IN",
        tapCount: 1,
        createdAtUtc: "2026-11-13T07:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:02:00.000Z",
      });

      // 1. Regular Entry tap on perimeter door
      const res1 = await repo.recordDoorTap({
        visitId: "vis-topo-1",
        doorIndexCode: "door-turnstile-1",
        direction: "in",
        tappedAtUtc: "2026-11-13T08:30:00.000Z",
      });

      expect(res1.event.inAndOutType).toBe(1);
      expect(res1.event.isPerimeter).toBe(true);
      expect(res1.visit.lastSeenDoor).toBeDefined();
      expect(res1.visit.lastSeenDoor?.doorIndexCode).toBe("door-turnstile-1");
      expect(res1.visit.lastSeenDoor?.direction).toBe("in");
      expect(res1.visit.lastSeenDoor?.isPerimeter).toBe(true);
      expect(res1.visit.lastSeenDoor?.accessType).toBe("DUAL_DIRECTION");
      expect(res1.tapCount).toBe(2); // vis-topo-1 started with tapCount 1

      // 2. Implicit Departure event does NOT increment tapCount against quota
      const res2 = await repo.recordDoorTap({
        visitId: "vis-topo-1",
        doorIndexCode: "door-jkt-dc-01",
        doorName: "DC Server Room 01",
        direction: "out",
        isImplicit: true,
        transitionNote: "Implicit exit upon room transition",
        tappedAtUtc: "2026-11-13T08:45:00.000Z",
      });

      expect(res2.event.inAndOutType).toBe(2);
      expect(res2.event.isImplicit).toBe(true);
      expect(res2.event.implicit).toBe(true);
      expect(res2.tapCount).toBe(2); // NOT incremented for implicit tap!
      expect(res2.visit.tapCount).toBe(2);
      expect(res2.visit.lastSeenDoor?.doorIndexCode).toBe("door-jkt-dc-01");
      expect(res2.visit.lastSeenDoor?.direction).toBe("out");
    });
  });

  describe("emergency access grants", () => {
    const activeVisit: Visit = {
      id: "vis-emg-1",
      visitorGivenName: "Diana",
      visitorFamilyName: "Prince",
      visitReasonType: 3,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T12:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T19:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 1,
      createdAtUtc: "2026-11-13T07:30:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    beforeEach(async () => {
      await repo.saveVisit(activeVisit);
    });

    it("saves and retrieves emergency access grants", async () => {
      const futureExpiry = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const grant: EmergencyAccessGrant = {
        id: "grant-test-1",
        visitId: "vis-emg-1",
        doorIndexCodes: ["door-jkt-dc-01"],
        doorNames: ["DC Server Room 01"],
        grantedByUserId: "user-sec-01",
        grantedByName: "Officer Wayne",
        reason: "Critical network fiber splice",
        grantedAtUtc: "2026-11-13T09:00:00.000Z",
        expiresAtUtc: futureExpiry,
        status: "ACTIVE",
      };

      await repo.saveEmergencyGrant(grant);

      const grants = await repo.getEmergencyGrants("vis-emg-1");
      expect(grants).toHaveLength(1);
      expect(grants[0].id).toBe("grant-test-1");
      expect(grants[0].doorIndexCodes).toEqual(["door-jkt-dc-01"]);
      expect(grants[0].status).toBe("ACTIVE");
    });

    it("populates active emergency grants on getVisit and listActiveVisits", async () => {
      const futureExpiry = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const grant: EmergencyAccessGrant = {
        id: "grant-test-2",
        visitId: "vis-emg-1",
        doorIndexCodes: ["door-jkt-dc-01", "door-jkt-b1-al"],
        doorNames: ["DC Server Room 01", "Basement AirLock"],
        grantedByUserId: "user-sec-01",
        grantedByName: "Officer Wayne",
        reason: "Emergency data center repair",
        grantedAtUtc: "2026-11-13T09:00:00.000Z",
        expiresAtUtc: futureExpiry,
        status: "ACTIVE",
      };

      await repo.saveEmergencyGrant(grant);

      const visit = await repo.getVisit("vis-emg-1");
      expect(visit?.emergencyGrants).toBeDefined();
      expect(visit?.emergencyGrants).toHaveLength(1);
      expect(visit?.emergencyGrants?.[0].id).toBe("grant-test-2");

      const activeVisits = await repo.listActiveVisits();
      const diana = activeVisits.find((v) => v.id === "vis-emg-1");
      expect(diana?.emergencyGrants).toBeDefined();
      expect(diana?.emergencyGrants).toHaveLength(1);
      expect(diana?.emergencyGrants?.[0].doorIndexCodes).toContain("door-jkt-dc-01");
    });

    it("revokes an emergency grant and updates active grant population", async () => {
      const futureExpiry = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const grant: EmergencyAccessGrant = {
        id: "grant-test-3",
        visitId: "vis-emg-1",
        doorIndexCodes: ["door-jkt-dc-01"],
        doorNames: ["DC Server Room 01"],
        grantedByUserId: "user-sec-01",
        grantedByName: "Officer Wayne",
        reason: "Temporary investigation",
        grantedAtUtc: "2026-11-13T09:00:00.000Z",
        expiresAtUtc: futureExpiry,
        status: "ACTIVE",
      };

      await repo.saveEmergencyGrant(grant);

      const revoked = await repo.revokeEmergencyGrant(
        "grant-test-3",
        "user-sec-02",
        "Officer Gordon",
      );

      expect(revoked.status).toBe("REVOKED");
      expect(revoked.revokedByUserId).toBe("user-sec-02");
      expect(revoked.revokedByName).toBe("Officer Gordon");
      expect(revoked.revokedAtUtc).toBeDefined();

      // getVisit only populates active grants
      const visit = await repo.getVisit("vis-emg-1");
      expect(visit?.emergencyGrants).toHaveLength(0);

      // getEmergencyGrants returns all grants including revoked
      const grants = await repo.getEmergencyGrants("vis-emg-1");
      expect(grants).toHaveLength(1);
      expect(grants[0].status).toBe("REVOKED");
    });

    it("throws error when revoking a non-existent grant", async () => {
      await expect(
        repo.revokeEmergencyGrant("non-existent", "user-1"),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("autoCheckInVisit and hostNotifications", () => {
    it("atomically performs auto check-in, initializes tapCount to 1, logs tap event, and stores host notification", async () => {
      await repo.saveDoors(TEST_FIXTURE_DOORS);
      const approvedVisit: Visit = {
        id: "vis-auto-chk-1",
        visitorGivenName: "Diana",
        visitorFamilyName: "Prince",
        visitorPhone: "+6281299998888",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 1,
        scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T16:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T18:00:00+07:00",
        status: "APPROVED",
        tapCount: 0,
        createdAtUtc: "2026-11-13T08:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:00:00.000Z",
      };
      await repo.saveVisit(approvedVisit);

      const tapTime = "2026-11-13T08:50:00.000Z";
      const hostNotification = {
        id: "notif-1",
        visitId: "vis-auto-chk-1",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitorName: "Diana Prince",
        doorIndexCode: "door-turnstile-1",
        doorName: "Lobby Main SpeedGate A",
        arrivedAtUtc: tapTime,
        message: "Visitor Diana Prince has arrived at Lobby Main SpeedGate A.",
        createdAtUtc: tapTime,
      };

      const result = await repo.autoCheckInVisit({
        visitId: "vis-auto-chk-1",
        actualCheckInTimeUtc: tapTime,
        tapEvent: {
          visitId: "vis-auto-chk-1",
          doorIndexCode: "door-turnstile-1",
          doorName: "Lobby Main SpeedGate A",
          direction: "in",
          isPerimeter: true,
          tappedAtUtc: tapTime,
        },
        hostNotification,
      });

      // Verify atomic state update on visit
      expect(result.visit.status).toBe("CHECKED_IN");
      expect(result.visit.actualCheckInTimeUtc).toBe(tapTime);
      expect(result.visit.tapCount).toBe(1);
      expect(result.visit.lastSeenDoor).toBeDefined();
      expect(result.visit.lastSeenDoor?.doorIndexCode).toBe("door-turnstile-1");
      expect(result.visit.lastSeenDoor?.direction).toBe("in");
      expect(result.visit.lastSeenDoor?.isPerimeter).toBe(true);

      // Verify DoorTapEvent was recorded
      expect(result.event.inAndOutType).toBe(1);
      expect(result.event.direction).toBe("in");
      expect(result.event.isPerimeter).toBe(true);

      const tapEvents = await repo.listDoorTapEvents("vis-auto-chk-1");
      expect(tapEvents).toHaveLength(1);
      expect(tapEvents[0].doorIndexCode).toBe("door-turnstile-1");
      expect(tapEvents[0].direction).toBe("in");

      // Verify CheckInAuditEvent was created
      const checkInAudits = await repo.listCheckInEvents("vis-auto-chk-1");
      expect(checkInAudits).toHaveLength(1);
      expect(checkInAudits[0].checkedInAtUtc).toBe(tapTime);

      // Verify HostNotification was saved
      const notifications = await repo.listHostNotifications("emp-host-01");
      expect(notifications).toHaveLength(1);
      expect(notifications[0].visitorName).toBe("Diana Prince");
      expect(notifications[0].visitId).toBe("vis-auto-chk-1");
    });

    it("throws if autoCheckInVisit called for non-existent visit", async () => {
      await expect(
        repo.autoCheckInVisit({
          visitId: "non-existent",
          actualCheckInTimeUtc: "2026-11-13T09:00:00.000Z",
          tapEvent: {
            visitId: "non-existent",
            doorIndexCode: "door-turnstile-1",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:00:00.000Z",
          },
        }),
      ).rejects.toThrow(/Visit not found/i);
    });
  });
});

describe("createVmsRepository", () => {
  it("always returns the PostgreSQL repository, with no in-memory fallback", () => {
    expect(createVmsRepository()).toBeInstanceOf(PostgresVmsRepository);
  });
});
