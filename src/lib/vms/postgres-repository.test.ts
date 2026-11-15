import { describe, it, expect, vi, beforeEach } from "vitest";
import * as s from "../db/schema";
import type { VmsDatabase } from "../db/client";
import { PostgresVmsRepository } from "./postgres-repository";
import type { Facility, Visit } from "./vms-contract";
import type { FacilityDoor } from "./checkout-contract";
import type { AccessLevel } from "./access-level-contract";

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

  describe("accessLevels (Ticket 03)", () => {
    it("saves and upserts flat access level with nullable facilityId", async () => {
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const level: AccessLevel = {
        id: "acc-flat-01",
        name: "Flat Building Access",
        description: "Entire site access",
        doors: ["door-01", "door-02"],
        timeScheduleId: 2,
        isDefault: false,
      };

      await repo.saveAccessLevel(level);
      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "acc-flat-01",
          facilityId: null,
          name: "Flat Building Access",
        }),
      );
    });

    it("lists flat access levels across building", async () => {
      const mockFrom = vi.fn().mockResolvedValue([
        {
          id: "acc-flat-01",
          facilityId: null,
          name: "Flat Building Access",
          data: {
            id: "acc-flat-01",
            name: "Flat Building Access",
            description: "Entire site access",
            doors: ["door-01", "door-02"],
            timeScheduleId: 2,
            isDefault: false,
          },
        },
      ]);
      mockDb.select.mockReturnValue({ from: mockFrom });

      const results = await repo.listAccessLevels();
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Flat Building Access");
      expect(results[0].facilityId).toBeUndefined();
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

  describe("systemSettings", () => {
    it("returns default fallback settings when no record exists in database", async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const settings = await repo.getSettings();
      expect(settings).toBeDefined();
      expect(settings.id).toBe("default");
      expect(settings.timezone).toBe("Asia/Jakarta");
      expect(settings.overstayGraceMinutes).toBe(15);
      expect(settings.autoCheckInEarlyBufferMinutes).toBe(15);
      expect(settings.updatedAt).toBeDefined();
    });

    it("returns database system settings record when present", async () => {
      const mockSettings = {
        id: "default",
        timezone: "Asia/Makassar",
        overstayGraceMinutes: 30,
        autoCheckInEarlyBufferMinutes: 20,
        updatedAt: "2026-11-15T12:00:00.000Z",
      };
      const mockWhere = vi.fn().mockResolvedValue([
        {
          id: "default",
          timezone: "Asia/Makassar",
          overstayGraceMinutes: 30,
          autoCheckInEarlyBufferMinutes: 20,
          updatedAt: "2026-11-15T12:00:00.000Z",
          data: mockSettings,
        },
      ]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      const settings = await repo.getSettings();
      expect(settings).toEqual(mockSettings);
    });

    it("updates system settings with upsert onConflictDoUpdate", async () => {
      // 1. Mock getSettings returning default
      const mockWhere = vi.fn().mockResolvedValue([]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue({ from: mockFrom });

      // 2. Mock insert with onConflictDoUpdate
      const mockOnConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflictDoUpdate,
      });
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await repo.updateSettings({
        timezone: "Asia/Jayapura",
        overstayGraceMinutes: 45,
      });

      expect(result.timezone).toBe("Asia/Jayapura");
      expect(result.overstayGraceMinutes).toBe(45);
      expect(result.autoCheckInEarlyBufferMinutes).toBe(15);
      expect(mockDb.insert).toHaveBeenCalledWith(s.systemSettings);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "default",
          timezone: "Asia/Jayapura",
          overstayGraceMinutes: 45,
          autoCheckInEarlyBufferMinutes: 15,
        }),
      );
    });
  });
});
