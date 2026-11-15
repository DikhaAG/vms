import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryVmsRepository } from "@/lib/vms/repository";
import { createContext } from "@/server/trpc/context";
import { createCaller, type AppCaller } from "@/server/trpc/routers/_app";
import type { Visit } from "@/lib/vms/vms-contract";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";
import { TRPCError } from "@trpc/server";

describe("tRPC End-to-End Type-Safe Routers", () => {
  let repository: InMemoryVmsRepository;
  let caller: AppCaller;

  beforeEach(async () => {
    repository = new InMemoryVmsRepository();
    const ctx = await createContext({ repository, facilityTimezone: "Asia/Jakarta" });
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
        facilityId: "fac-jakarta",
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
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
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
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
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
      const res = await caller.approval.listPending({ facilityId: "fac-jakarta" });
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
    it("lists access levels for a facility", async () => {
      const res = await caller.accessLevel.list({ facilityId: "fac-jakarta" });
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThanOrEqual(1);
    });

    it("creates a new access level", async () => {
      const res = await caller.accessLevel.create({
        facilityId: "fac-jakarta",
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
    });

    it("throws BAD_REQUEST when creating access level with invalid fields", async () => {
      await expect(
        caller.accessLevel.create({
          facilityId: "fac-jakarta",
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
      facilityId: "fac-jakarta",
      accessType: "DUAL_DIRECTION",
      isPerimeter: true,
    };

    const activeVisit: Visit = {
      id: "vis-active-trpc-1",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
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
      const res = await caller.monitoring.listActive({ facilityId: "fac-jakarta" });
      expect(res.activeVisits).toBeDefined();
      expect(res.activeVisits.length).toBe(1);
      expect(res.activeVisits[0].visitor.fullName).toBe("Diana Prince");
      expect(res.summary.totalOnPremise).toBe(1);
    });

    it("fetches door telemetry list", async () => {
      const res = await caller.monitoring.fetchDoorTelemetry({ facilityId: "fac-jakarta" });
      expect(Array.isArray(res)).toBe(true);
      expect(res.some((d: FacilityDoor) => d.doorIndexCode === "door-south-01")).toBe(true);
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
});
