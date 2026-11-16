import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryVmsRepository } from "@/lib/vms/repository";
import { createContext } from "@/server/trpc/context";
import { createCaller, type AppCaller } from "@/server/trpc/routers/_app";
import type { Visit } from "@/lib/vms/vms-contract";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";
import { TRPCError } from "@trpc/server";
import { syncHikCentralDoors } from "@/lib/vms/hikcentral-door-adapter";

vi.mock("@/lib/vms/hikcentral-door-adapter", () => ({
  syncHikCentralDoors: vi.fn(),
}));

describe("tRPC End-to-End Type-Safe Routers", () => {
  let repository: InMemoryVmsRepository;
  let caller: AppCaller;

  beforeEach(async () => {
    repository = new InMemoryVmsRepository();
    const ctx = await createContext({ repository });
    caller = createCaller(ctx);
  });

  describe("visitorRouter", () => {
    it("searches visitor profiles from repository", async () => {
      await repository.saveVisitorProfile({
        id: "prof-trpc-1",
        fullName: "Budi Santoso",
        email: "budi@example.com",
        phone: "+62811111111",
        certificateType: 111,
        certificateNo: "3171000000000001",
        isDeleted: false,
        visitCount: 2,
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      });

      const res = await caller.visitor.search({ query: "Budi" });
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(1);
      expect(res[0].fullName).toBe("Budi Santoso");
    });

    it("pre-registers a visitor successfully", async () => {
      const res = await caller.visitor.preRegister({
        visitorGivenName: "Alice",
        visitorFamilyName: "Smith",
        certificateType: 111,
        certificateNo: "3171000000000002",
        visitReasonType: 0,
        scheduledStartTime: "2026-11-20T09:00:00+07:00",
        scheduledEndTime: "2026-11-20T12:00:00+07:00",
        hostId: "emp-host-01",
        hostName: "Budi Santoso",
        mode: "stub",
      });

      expect(res.ok).toBe(true);
      expect(res.visit).toBeDefined();
      expect(res.visit?.visitorGivenName).toBe("Alice");
    });

    it("throws BAD_REQUEST when pre-register has validation errors", async () => {
      await expect(
        caller.visitor.preRegister({
          facilityId: "fac-jakarta",
          visitorGivenName: "", // invalid empty name
          visitorFamilyName: "Smith",
          certificateType: 111,
          certificateNo: "3171000000000002",
          visitReasonType: 0,
          scheduledStartTime: "2026-11-20T09:00:00+07:00",
          scheduledEndTime: "2026-11-20T12:00:00+07:00",
        } as unknown as Parameters<typeof caller.visitor.preRegister>[0]),
      ).rejects.toThrow();
    });

    it("cancels an existing pre-registration", async () => {
      const visit: Visit = {
        id: "vis-cancel-target",
        visitorGivenName: "Cancel",
        visitorFamilyName: "Candidate",
        certificateType: 111,
        certificateNo: "3171999999999999",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T02:00:00Z",
        scheduledEndTimeUtc: "2026-11-20T05:00:00Z",
        scheduledStartTimeFacility: "2026-11-20T09:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T12:00:00+07:00",
        status: "PENDING_APPROVAL",
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
      await repository.saveVisit(visit);

      const res = await caller.visitor.cancelPreRegistration({
        visitId: "vis-cancel-target",
        reason: "Jadwal meeting dibatalkan",
      });

      expect(res.ok).toBe(true);
      const updated = await repository.getVisit("vis-cancel-target");
      expect(updated?.status).toBe("CANCELLED");
    });

    it("throws NOT_FOUND when cancelling a nonexistent visit", async () => {
      await expect(
        caller.visitor.cancelPreRegistration({
          visitId: "vis-does-not-exist",
          reason: "Not found",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("approvalRouter", () => {
    beforeEach(async () => {
      const pendingVisit: Visit = {
        id: "vis-trpc-pending",
        visitorGivenName: "Dewi",
        visitorFamilyName: "Santoso",
        certificateType: 111,
        certificateNo: "3171000000000003",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T02:00:00Z",
        scheduledEndTimeUtc: "2026-11-20T05:00:00Z",
        scheduledStartTimeFacility: "2026-11-20T09:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T12:00:00+07:00",
        status: "PENDING_APPROVAL",
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      };
      await repository.saveVisit(pendingVisit);
    });

    it("lists pending approvals with counts", async () => {
      const res = await caller.approval.listPending();
      expect(res).toBeDefined();
      expect(res.pendingVisits.length).toBeGreaterThanOrEqual(1);
      expect(res.pendingVisits.some((v: Visit) => v.id === "vis-trpc-pending")).toBe(true);
    });

    it("approves a pending visit", async () => {
      const res = await caller.approval.approve({
        visitId: "vis-trpc-pending",
        comment: "Disetujui untuk rapat",
        approver: {
          id: "usr-app-1",
          name: "Manager",
          role: "Facility Manager",
        },
      });

      expect(res.visit.status).toBe("APPROVED");
      expect(res.approvalRecord.action).toBe("approve");
    });

    it("rejects a visit with a required comment", async () => {
      const res = await caller.approval.reject({
        visitId: "vis-trpc-pending",
        comment: "Ruang rapat penuh",
      });

      expect(res.visit.status).toBe("REJECTED");
      expect(res.approvalRecord.action).toBe("reject");
    });

    it("throws NOT_FOUND when approving non-existent visit", async () => {
      await expect(
        caller.approval.approve({
          visitId: "vis-non-existent",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("accessLevelRouter", () => {
    it("starts with empty access levels on fresh boot", async () => {
      const emptyList = await caller.accessLevel.list();
      expect(emptyList).toEqual([]);
    });

    it("creates and lists flat access levels without facility parameters", async () => {
      const res = await caller.accessLevel.create({
        name: "Lantai 3 Executive Lounge",
        description: "Area eksekutif lantai 3",
        doors: ["Door 301", "Door 302"],
        floors: ["3F"],
        timeScheduleId: 1,
        isDefault: false,
      });

      expect(res).toBeDefined();
      expect(res.name).toBe("Lantai 3 Executive Lounge");
      expect(res.doors).toEqual(["Door 301", "Door 302"]);

      const list = await caller.accessLevel.list();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe("Lantai 3 Executive Lounge");
    });

    it("lists all created access levels (single-site: no facility scoping)", async () => {
      await caller.accessLevel.create({
        name: "Jakarta Legacy Level",
        doors: ["Door JKT 01"],
        timeScheduleId: 2,
      });

      const res = await caller.accessLevel.list();
      expect(res.some((l) => l.name === "Jakarta Legacy Level")).toBe(true);
    });

    it("throws BAD_REQUEST when creating access level with invalid fields", async () => {
      await expect(
        caller.accessLevel.create({
          name: "", // empty name violates validation
          doors: [],
        } as unknown as Parameters<typeof caller.accessLevel.create>[0]),
      ).rejects.toThrow();
    });
  });

  describe("monitoringRouter", () => {
    const door1: FacilityDoor = {
      doorIndexCode: "door-south-01",
      doorName: "South Lobby Turnstile",
      accessType: "DUAL_DIRECTION",
      isPerimeter: true,
    };

    const activeVisit: Visit = {
      id: "vis-active-trpc-1",
      visitorGivenName: "Diana",
      visitorFamilyName: "Prince",
      visitReasonType: 3,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 1,
      tapQuota: {
        mode: "limited",
        maxTaps: 5,
      },
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    beforeEach(async () => {
      await repository.saveDoor(door1);
      await repository.saveVisit(activeVisit);
    });

    it("lists active visits and returns occupancy metrics", async () => {
      const res = await caller.monitoring.listActive();
      expect(res.activeVisits).toBeDefined();
      expect(res.activeVisits.length).toBe(1);
      expect(res.activeVisits[0].visitor.fullName).toBe("Diana Prince");
      expect(res.summary.totalOnPremise).toBe(1);
    });

    // Compile-time contract, enforced by `pnpm typecheck` (not by vitest):
    // the directives fail as unused if a facilityId input reappears.
    // Never invoked, so no procedure runs.
    const _monitoringRejectsFacilityInput = () => {
      // @ts-expect-error facilityId was removed from approval.listPending
      void caller.approval.listPending({ facilityId: "fac-jakarta" });
      // @ts-expect-error facilityId was removed from monitoring.listActive
      void caller.monitoring.listActive({ facilityId: "fac-jakarta" });
      // @ts-expect-error facilityId was removed from monitoring.fetchDoorTelemetry
      void caller.monitoring.fetchDoorTelemetry({ facilityId: "fac-jakarta" });
    };
    void _monitoringRejectsFacilityInput;

    it("monitors every active visit site-wide and flags overstay with the global grace setting", async () => {
      await repository.saveVisit({
        ...activeVisit,
        id: "vis-active-trpc-2",
        visitorGivenName: "Bruce",
        visitorFamilyName: "Wayne",
      });

      vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-13T10:25:00.000Z") });
      try {
        // 25 minutes past scheduled end, inside a 30-minute global grace.
        await caller.settings.update({ overstayGraceMinutes: 30 });
        const withinGrace = await caller.monitoring.listActive();
        expect(withinGrace.activeVisits.map((v) => v.visitId).sort()).toEqual([
          "vis-active-trpc-1",
          "vis-active-trpc-2",
        ]);
        expect(withinGrace.summary.overstayAlerts).toBe(0);

        // Same moment, but the global grace shrinks to 20 minutes.
        await caller.settings.update({ overstayGraceMinutes: 20 });
        const pastGrace = await caller.monitoring.listActive();
        expect(pastGrace.summary.overstayAlerts).toBe(2);
        expect(pastGrace.summary.normal).toBe(0);
        expect(pastGrace.activeVisits.map((v) => v.status)).toEqual([
          "OVERSTAY",
          "OVERSTAY",
        ]);
        expect(pastGrace.activeVisits[0].overstayMinutes).toBe(25);
      } finally {
        vi.useRealTimers();
      }
    });

    it("fetches door telemetry list", async () => {
      await repository.saveDoor({
        doorIndexCode: "door-bali-01",
        doorName: "Bali Side Gate",
        accessType: "DUAL_DIRECTION",
        isPerimeter: true,
      });

      const res = await caller.monitoring.fetchDoorTelemetry();
      expect(res.map((d: FacilityDoor) => d.doorIndexCode).sort()).toEqual([
        "door-bali-01",
        "door-south-01",
      ]);
    });

    it("triggers emergency door unlock for checked-in visit", async () => {
      const res = await caller.monitoring.emergencyDoorUnlock({
        visitId: "vis-active-trpc-1",
        doorIndexCodes: ["door-south-01"],
        grantedByUserId: "usr-sec-01",
        grantedByName: "Chief Security Officer",
        reason: "Pemeriksaan darurat perimeter server room",
        durationHours: 2,
        mode: "stub",
      });

      expect(res.grant).toBeDefined();
      expect(res.grant.doorIndexCodes).toEqual(["door-south-01"]);
      expect(res.grant.status).toBe("ACTIVE");
    });

    it("throws NOT_FOUND when emergency unlock target visit does not exist", async () => {
      await expect(
        caller.monitoring.emergencyDoorUnlock({
          visitId: "vis-ghost",
          doorIndexCodes: ["door-south-01"],
          grantedByUserId: "usr-sec-01",
          reason: "Emergency access test reason with ten chars",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("settingsRouter", () => {
    it("retrieves current global system settings", async () => {
      const settings = await caller.settings.get();
      expect(settings).toBeDefined();
      expect(settings.id).toBe("default");
      expect(settings.timezone).toBe("Asia/Jakarta");
      expect(settings.overstayGraceMinutes).toBe(15);
      expect(settings.autoCheckInEarlyBufferMinutes).toBe(15);

      const settingsAlias = await caller.settings.getSettings();
      expect(settingsAlias).toEqual(settings);
    });

    it("updates global system settings through mutation", async () => {
      const updated = await caller.settings.updateSettings({
        timezone: "Asia/Makassar",
        overstayGraceMinutes: 20,
        autoCheckInEarlyBufferMinutes: 10,
      });

      expect(updated.timezone).toBe("Asia/Makassar");
      expect(updated.overstayGraceMinutes).toBe(20);
      expect(updated.autoCheckInEarlyBufferMinutes).toBe(10);

      const refreshed = await caller.settings.get();
      expect(refreshed.timezone).toBe("Asia/Makassar");
      expect(refreshed.overstayGraceMinutes).toBe(20);
    });

    it("validates input on update mutation and rejects invalid timezones", async () => {
      await expect(
        caller.settings.update({
          timezone: "Invalid/Not_A_Real_Timezone",
        }),
      ).rejects.toThrow();
    });
  });

  describe("doorsRouter", () => {
    it("starts with empty doors on fresh repository boot", async () => {
      const doors = await caller.doors.list();
      expect(Array.isArray(doors)).toBe(true);
      expect(doors).toHaveLength(0);
    });

    it("synchronizes doors via syncDoors procedure and makes them immediately queryable", async () => {
      const mockDoors: FacilityDoor[] = [
        {
          id: "door-turnstile-01",
          doorIndexCode: "door-turnstile-01",
          doorName: "Main Entrance SpeedGate",
          regionIndexCode: "reg-lobby",
          channelNo: "1",
          doorState: 1,
          isOnline: true,
          accessType: "DUAL_DIRECTION",
          isPerimeter: true,
        },
      ];
      vi.mocked(syncHikCentralDoors).mockImplementationOnce(async (opts) => {
        const repo = opts?.repository;
        await repo?.saveDoors(mockDoors);
        return {
          ok: true,
          totalSynced: mockDoors.length,
          doors: mockDoors,
        };
      });

      const syncResult = await caller.doors.syncDoors({});
      expect(syncResult.ok).toBe(true);
      expect(syncResult.totalSynced).toBe(1);

      const doors = await caller.doors.list();
      expect(doors.length).toBe(1);
      expect(doors[0].doorIndexCode).toBe("door-turnstile-01");
      expect(doors[0].regionIndexCode).toBe("reg-lobby");
      expect(doors[0].isOnline).toBe(true);

      const fetchedDoor = await caller.doors.get({ doorIndexCode: "door-turnstile-01" });
      expect(fetchedDoor).toBeDefined();
      expect(fetchedDoor.doorName).toBe("Main Entrance SpeedGate");
    });

    it("throws NOT_FOUND when getting non-existent door", async () => {
      await expect(
        caller.doors.get({ doorIndexCode: "door-ghost" }),
      ).rejects.toThrow(TRPCError);
    });

    it("handles hardware offline / unreachable conditions by throwing BAD_GATEWAY", async () => {
      vi.mocked(syncHikCentralDoors).mockResolvedValueOnce({
        ok: false,
        totalSynced: 0,
        doors: [],
        error: {
          kind: "upstream",
          message: "HikCentral gateway unreachable: connection timed out",
          code: "ETIMEDOUT",
        },
      });

      await expect(caller.doors.syncDoors({})).rejects.toThrow(TRPCError);
    });

    it("handles configuration errors by throwing INTERNAL_SERVER_ERROR", async () => {
      vi.mocked(syncHikCentralDoors).mockResolvedValueOnce({
        ok: false,
        totalSynced: 0,
        doors: [],
        error: {
          kind: "config",
          message: "Missing HIKCENTRAL_APP_KEY",
        },
      });

      await expect(caller.doors.syncDoors({})).rejects.toThrow(TRPCError);
    });
  });
});

