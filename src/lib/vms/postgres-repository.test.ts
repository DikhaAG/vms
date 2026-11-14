import { describe, it, expect, vi, beforeEach } from "vitest";
import * as s from "../db/schema";
import type { VmsDatabase } from "../db/client";
import { PostgresVmsRepository } from "./postgres-repository";
import type { Facility, Visit } from "./vms-contract";
import type { FacilityDoor } from "./checkout-contract";

describe("PostgresVmsRepository", () => {
  let mockDb: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let repo: PostgresVmsRepository;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    repo = new PostgresVmsRepository(mockDb as unknown as VmsDatabase);
  });

  describe("facilities", () => {
    it("lists facilities mapped correctly from db records", async () => {
      const sampleFacility: Facility = {
        id: "fac-jkt",
        name: "Jakarta HQ",
        timezone: "Asia/Jakarta",
        address: "Sudirman",
        overstayGraceMinutes: 15,
      };
      const mockFrom = vi.fn().mockResolvedValue([
        {
          id: "fac-jkt",
          name: "Jakarta HQ",
          timezone: "Asia/Jakarta",
          address: "Sudirman",
          overstayGraceMinutes: 15,
          data: sampleFacility,
        },
      ]);
      mockDb.select.mockReturnValue({ from: mockFrom });

      const list = await repo.listFacilities();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("fac-jkt");
      expect(list[0].timezone).toBe("Asia/Jakarta");
    });

    it("gets single facility by ID", async () => {
      const sampleFacility: Facility = {
        id: "fac-jkt",
        name: "Jakarta HQ",
        timezone: "Asia/Jakarta",
        address: "Sudirman",
        overstayGraceMinutes: 15,
      };
      const mockWhere = vi.fn().mockResolvedValue([
        {
          id: "fac-jkt",
          name: "Jakarta HQ",
          timezone: "Asia/Jakarta",
          address: "Sudirman",
          overstayGraceMinutes: 15,
          data: sampleFacility,
        },
      ]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const fac = await repo.getFacility("fac-jkt");
      expect(fac).toBeDefined();
      expect(fac?.name).toBe("Jakarta HQ");
    });
  });

  describe("doors", () => {
    it("saves doors using upsert query", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const door: FacilityDoor = {
        id: "door-01",
        facilityId: "fac-jkt",
        doorIndexCode: "door-turnstile-1",
        doorName: "Main SpeedGate",
        accessType: "DUAL_DIRECTION",
        isPerimeter: true,
      };

      await repo.saveDoor(door);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          doorIndexCode: "door-turnstile-1",
          doorName: "Main SpeedGate",
        }),
      );
    });
  });

  describe("visits", () => {
    it("retrieves a visit and returns full typed Visit object", async () => {
      const sampleVisit: Visit = {
        id: "vis-123",
        facilityId: "fac-jkt",
        facilityName: "Jakarta HQ",
        hostId: "host-1",
        hostName: "Budi Host",
        visitorFamilyName: "Pratama",
        visitorGivenName: "Andi",
        certificateType: 111,
        certificateNo: "3171234567890001",
        visitReasonType: 1,
        scheduledStartTimeUtc: "2026-11-15T02:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-15T04:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-15T09:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-15T11:00:00+07:00",
        status: "PENDING_APPROVAL",
        createdAtUtc: "2026-11-14T10:00:00.000Z",
        updatedAtUtc: "2026-11-14T10:00:00.000Z",
        accessLevelIds: ["acc-1", "acc-2"],
        tapQuota: { mode: "limited", maxTaps: 4 },
      };

      const mockWhereVisit = vi.fn().mockResolvedValue([
        {
          id: "vis-123",
          facilityId: "fac-jkt",
          status: "PENDING_APPROVAL",
          createdAtUtc: "2026-11-14T10:00:00.000Z",
          data: sampleVisit,
        },
      ]);
      const mockOrderByGrants = vi.fn().mockResolvedValue([]);
      const mockWhereGrants = vi.fn().mockReturnValue({
        orderBy: mockOrderByGrants,
      });

      mockDb.select.mockImplementation(() => ({
        from: (table: unknown) => {
          if (table === s.emergencyAccessGrants) {
            return {
              where: mockWhereGrants,
              orderBy: mockOrderByGrants,
            };
          }
          return { where: mockWhereVisit };
        },
      }));

      const visit = await repo.getVisit("vis-123");
      expect(visit).toBeDefined();
      expect(visit?.id).toBe("vis-123");
      expect(visit?.accessLevelIds).toEqual(["acc-1", "acc-2"]);
      expect(visit?.tapQuota?.maxTaps).toBe(4);
    });
  });
});
