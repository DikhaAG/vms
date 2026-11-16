import { beforeEach, describe, expect, it } from "vitest";
import { CheckInService } from "./checkin-service";
import { InMemoryVmsRepository } from "./repository";
import type { Visit } from "./vms-contract";
import type { AccessLevel } from "./access-level-contract";

describe("CheckInService (Single-Site Lean Architecture - Ticket 05)", () => {
  let repo: InMemoryVmsRepository;
  let service: CheckInService;

  const lobbyAccessLevel: AccessLevel = {
    id: "acc-building-lobby",
    name: "Building Perimeter & Main Lobby",
    description: "Site-wide turnstile and main lobby doors",
    doors: ["door-turnstile-1", "door-lobby-2"],
    floors: ["1F"],
    timeScheduleId: 2,
    isDefault: true,
  };

  const approvedVisit: Visit = {
    id: "vis-approved-01",
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
    accessLevelIds: ["acc-building-lobby"],
    tapQuota: {
      mode: "limited",
      maxTaps: 2,
    },
    createdAtUtc: "2026-11-13T01:00:00Z",
    updatedAtUtc: "2026-11-13T01:00:00Z",
  };

  beforeEach(async () => {
    repo = new InMemoryVmsRepository();
    await repo.saveAccessLevel(lobbyAccessLevel);
    service = new CheckInService(repo);
    await repo.saveVisit(approvedVisit);
  });

  describe("searchArrivingVisitors", () => {
    it("searches approved and checked-in visitors globally across the single site", async () => {
      await repo.saveVisit({
        ...approvedVisit,
        id: "vis-checkedin-02",
        visitorGivenName: "Siti",
        visitorFamilyName: "Rahma",
        visitorEmail: "siti.rahma@example.com",
        certificateNo: "3171020202020002",
        status: "CHECKED_IN",
      });

      const allResults = await service.searchArrivingVisitors("");
      expect(allResults).toHaveLength(2);

      const filteredResults = await service.searchArrivingVisitors("Rian");
      expect(filteredResults).toHaveLength(1);
      expect(filteredResults[0].id).toBe("vis-approved-01");
    });

    it("returns empty list if search query does not match", async () => {
      const results = await service.searchArrivingVisitors("NonExistentVisitor");
      expect(results).toHaveLength(0);
    });
  });

  describe("performCheckIn", () => {
    it("checks in an approved visit without facilityId and issues site-wide access pass", async () => {
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
      expect(result.pass?.accessLevelNames).toEqual([
        "Building Perimeter & Main Lobby",
      ]);

      const stored = await repo.getVisit("vis-approved-01");
      expect(stored?.status).toBe("CHECKED_IN");
      expect(stored?.hikCentral?.appointRecordId).not.toBe("hc-apt-rec-01");
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

    it("fails check-in if visit is not in APPROVED state", async () => {
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
    it("creates a walk-in visit without facilityId using global systemSettings.timezone and default building access levels", async () => {
      await repo.updateSettings({ timezone: "Asia/Makassar" });

      const result = await service.createWalkInVisit({
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
      expect(result.visit?.scheduledStartTimeFacility).toMatch(/\+08:00$/);
      expect(result.visit?.accessLevelIds).toEqual(["acc-building-lobby"]);
      expect(result.pass).toBeDefined();
      expect(result.pass?.pinCode).toBeDefined();
      expect(result.pass?.visitorName).toBe("Indra Gunawan");
      expect(result.pass?.accessLevelNames).toEqual([
        "Building Perimeter & Main Lobby",
      ]);

      const saved = await repo.getVisit(result.visit!.id);
      expect(saved?.status).toBe("CHECKED_IN");
      const auditLogs = await repo.listCheckInEvents(result.visit!.id);
      expect(auditLogs).toHaveLength(1);
    });
  });
});