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
      createdAtUtc: "2026-11-13T08:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:00:00.000Z",
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
});
