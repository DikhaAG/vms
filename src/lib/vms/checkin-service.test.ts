import { beforeEach, describe, expect, it } from "vitest";
import { CheckInService } from "./checkin-service";
import { InMemoryVmsRepository } from "./repository";
import type { Visit } from "./vms-contract";

describe("CheckInService", () => {
  let repo: InMemoryVmsRepository;
  let service: CheckInService;

  const approvedVisit: Visit = {
    id: "vis-approved-01",
    facilityId: "fac-jakarta",
    facilityName: "Jakarta Corporate HQ",
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitorFamilyName: "Pratama",
    visitorGivenName: "Rian",
    visitorPhone: "+62812345678",
    visitorEmail: "rian.pratama@example.com",
    certificateType: 111,
    certificateNo: "3171010101010001",
    visitReasonType: 0,
    scheduledStartTimeUtc: "2026-11-13T02:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T09:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
    status: "APPROVED",
    hikCentral: {
      appointRecordId: "hc-apt-rec-01",
      visitorId: "hc-vis-01",
      appointCode: "4321",
    },
    accessLevelIds: ["acc-jkt-lobby"],
    tapQuota: {
      mode: "limited",
      maxTaps: 2,
    },
    createdAtUtc: "2026-11-13T01:00:00Z",
    updatedAtUtc: "2026-11-13T01:00:00Z",
  };

  beforeEach(async () => {
    repo = new InMemoryVmsRepository();
    service = new CheckInService(repo);
    await repo.saveVisit(approvedVisit);
  });

  describe("searchArrivingVisitors", () => {
    it("searches approved visitors by query string and facilityId", async () => {
      const results = await service.searchArrivingVisitors(
        "Rian",
        "fac-jakarta",
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("vis-approved-01");
    });

    it("returns empty list if search query does not match", async () => {
      const results = await service.searchArrivingVisitors(
        "NonExistentVisitor",
        "fac-jakarta",
      );
      expect(results).toHaveLength(0);
    });
  });

  describe("performCheckIn", () => {
    it("successfully checks in an approved visit and updates appointRecordId and status to CHECKED_IN", async () => {
      const result = await service.performCheckIn("vis-approved-01", {
        visitId: "vis-approved-01",
        receptionistUserId: "rec-01",
        receptionistName: "Dewi Frontdesk",
        verificationMethod: "qr",
        notes: "Scanned pre-registration QR",
        mode: "stub",
        stubScenario: "success",
      });

      expect(result.ok).toBe(true);
      expect(result.visit?.status).toBe("CHECKED_IN");
      expect(result.visit?.actualCheckInTimeUtc).toBeDefined();
      expect(result.pass?.pinCode).toBeDefined();
      expect(result.pass?.qrCodeImage).toBeDefined();
      expect(result.pass?.visitorName).toBe("Rian Pratama");

      // Verify stored visit in repository has updated appointRecordId and status
      const stored = await repo.getVisit("vis-approved-01");
      expect(stored?.status).toBe("CHECKED_IN");
      expect(stored?.hikCentral?.appointRecordId).toBeDefined();
      expect(stored?.hikCentral?.appointRecordId).not.toBe("hc-apt-rec-01"); // Updated on checkin!
    });

    it("fails check-in if visit does not exist", async () => {
      const result = await service.performCheckIn("unknown-id", {
        visitId: "unknown-id",
        receptionistUserId: "rec-01",
        mode: "stub",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("not_found");
    });

    it("fails check-in if visit is not in APPROVED state (e.g. PENDING_APPROVAL or REJECTED)", async () => {
      await repo.saveVisit({
        ...approvedVisit,
        id: "vis-pending-02",
        status: "PENDING_APPROVAL",
      });

      const result = await service.performCheckIn("vis-pending-02", {
        visitId: "vis-pending-02",
        receptionistUserId: "rec-01",
        mode: "stub",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("invalid_state");
      expect(result.error?.message).toContain("Only approved visits");
    });

    it("gracefully returns upstream error if HikCentral registerment throws", async () => {
      const result = await service.performCheckIn("vis-approved-01", {
        visitId: "vis-approved-01",
        receptionistUserId: "rec-01",
        mode: "stub",
        stubScenario: "auth-error",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("upstream");
    });
  });

  describe("createWalkInVisit", () => {
    it("creates a walk-in visit, registers on HikCentral, sets status to CHECKED_IN, and issues pass", async () => {
      const result = await service.createWalkInVisit({
        facilityId: "fac-jakarta",
        hostId: "emp-host-01",
        hostName: "Budi Santoso",
        visitorFamilyName: "Gunawan",
        visitorGivenName: "Indra",
        visitorPhone: "+628111222333",
        visitorEmail: "indra.g@example.com",
        certificateType: 111,
        certificateNo: "3171020202020002",
        visitReasonType: 3,
        visitReasonDetail: "Urgent project sync",
        accessLevelIds: ["acc-jkt-lobby"],
        tapQuota: {
          mode: "limited",
          maxTaps: 1,
        },
        receptionistUserId: "rec-01",
        receptionistName: "Dewi Frontdesk",
        verificationMethod: "id_card",
        notes: "Identity card verified at reception",
        mode: "stub",
        stubScenario: "success",
      });

      expect(result.ok).toBe(true);
      expect(result.visit).toBeDefined();
      expect(result.visit?.status).toBe("CHECKED_IN");
      expect(result.visit?.visitorFamilyName).toBe("Gunawan");
      expect(result.pass).toBeDefined();
      expect(result.pass?.pinCode).toBeDefined();
      expect(result.pass?.visitorName).toBe("Indra Gunawan");

      // Verify visit saved in repository
      if (result.visit) {
        const saved = await repo.getVisit(result.visit.id);
        expect(saved).toBeDefined();
        expect(saved?.status).toBe("CHECKED_IN");
        expect(saved?.actualCheckInTimeUtc).toBeDefined();

        const auditLogs = await repo.listCheckInEvents(result.visit.id);
        expect(auditLogs).toHaveLength(1);
        expect(auditLogs[0].receptionistUserId).toBe("rec-01");
        expect(auditLogs[0].verificationMethod).toBe("id_card");
      }
    });

    it("fails walk-in if facility is invalid", async () => {
      const result = await service.createWalkInVisit({
        facilityId: "fac-invalid",
        visitorFamilyName: "Gunawan",
        visitorGivenName: "Indra",
        visitReasonType: 0,
        receptionistUserId: "rec-01",
        mode: "stub",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("not_found");
    });
  });
});
