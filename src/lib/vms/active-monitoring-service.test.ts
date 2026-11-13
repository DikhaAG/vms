import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository } from "./repository";
import { ActiveMonitoringService } from "./active-monitoring-service";
import type { Visit } from "./vms-contract";

describe("ActiveMonitoringService", () => {
  let repo: InMemoryVmsRepository;
  let service: ActiveMonitoringService;

  beforeEach(async () => {
    repo = new InMemoryVmsRepository();
    service = new ActiveMonitoringService(repo);

    // Seed test visits
    const visit1: Visit = {
      id: "vis-active-1",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorGivenName: "Alice",
      visitorFamilyName: "Smith",
      visitorPhone: "+62812345678",
      visitorEmail: "alice@example.com",
      hostId: "emp-host-01",
      hostName: "Rudi Host",
      visitReasonType: 3, // Meeting
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 1,
      tapQuota: {
        mode: "limited",
        maxTaps: 2,
      },
      hikCentral: {
        appointRecordId: "hc-rec-alice",
        visitorId: "hc-vis-alice",
      },
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    const visit2: Visit = {
      id: "vis-active-2",
      facilityId: "fac-bali",
      visitorGivenName: "Bob",
      visitorFamilyName: "Jones",
      visitReasonType: 0, // Business
      scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T12:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T17:00:00+08:00",
      scheduledEndTimeFacility: "2026-11-13T20:00:00+08:00",
      actualCheckInTimeUtc: "2026-11-13T09:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 0,
      tapQuota: {
        mode: "unlimited",
      },
      createdAtUtc: "2026-11-13T08:30:00.000Z",
      updatedAtUtc: "2026-11-13T09:05:00.000Z",
    };

    await repo.saveVisit(visit1);
    await repo.saveVisit(visit2);
  });

  describe("getActiveVisits", () => {
    it("returns active visits with computed overstay and quota calculations", async () => {
      // 10:35 UTC -> Alice is overstay (scheduledEnd: 10:00, grace: 15 min, elapsed: 35 min)
      const now = new Date("2026-11-13T10:35:00.000Z");
      const active = await service.getActiveVisits(undefined, now);

      expect(active).toHaveLength(2);

      const alice = active.find((v) => v.visitId === "vis-active-1");
      expect(alice).toBeDefined();
      expect(alice?.visitor.fullName).toBe("Alice Smith");
      expect(alice?.isOverstay).toBe(true);
      expect(alice?.overstayMinutes).toBe(35);
      expect(alice?.status).toBe("OVERSTAY");
      expect(alice?.tapCount).toBe(1);
      expect(alice?.maxTaps).toBe(2);
      expect(alice?.isQuotaExceeded).toBe(false);

      // Verify repository updated visit status to OVERSTAY
      const storedAlice = await repo.getVisit("vis-active-1");
      expect(storedAlice?.status).toBe("OVERSTAY");

      const bob = active.find((v) => v.visitId === "vis-active-2");
      expect(bob).toBeDefined();
      expect(bob?.isOverstay).toBe(false);
      expect(bob?.overstayMinutes).toBe(0);
      expect(bob?.tapQuotaMode).toBe("unlimited");
    });

    it("filters active visits by facilityId", async () => {
      const activeBali = await service.getActiveVisits("fac-bali");
      expect(activeBali).toHaveLength(1);
      expect(activeBali[0].visitId).toBe("vis-active-2");
    });
  });

  describe("recordTapAndEnforceQuota", () => {
    it("records a normal door tap when quota is not reached", async () => {
      const result = await service.recordTapAndEnforceQuota(
        "vis-active-2",
        {
          visitId: "vis-active-2",
          doorIndexCode: "door-turnstile-main",
          doorName: "Main Entrance",
          direction: "in",
          tappedAtUtc: "2026-11-13T09:30:00.000Z",
        },
        { mode: "stub" },
      );

      expect(result.tapCount).toBe(1);
      expect(result.isQuotaExceeded).toBe(false);
      expect(result.autoCheckedOut).toBe(false);
      expect(result.visit.status).toBe("CHECKED_IN");
    });

    it("automatically checks out and deauthorizes terminal access when tap quota is exhausted", async () => {
      // Alice has tapCount 1, maxTaps 2. Recording 1 more tap reaches quota!
      const result = await service.recordTapAndEnforceQuota(
        "vis-active-1",
        {
          visitId: "vis-active-1",
          doorIndexCode: "door-turnstile-lobby",
          doorName: "Lobby Turnstile",
          direction: "in",
          tappedAtUtc: "2026-11-13T09:45:00.000Z",
        },
        { mode: "stub" },
      );

      expect(result.tapCount).toBe(2);
      expect(result.isQuotaExceeded).toBe(true);
      expect(result.autoCheckedOut).toBe(true);
      expect(result.remainingTaps).toBe(0);

      // Verify visit is now CHECKED_OUT in repository
      const updatedVisit = await repo.getVisit("vis-active-1");
      expect(updatedVisit?.status).toBe("CHECKED_OUT");
      expect(updatedVisit?.checkOutReason).toMatch(/quota/i);

      // Verify audit event persisted
      const checkOutLogs = await repo.listCheckOutEvents("vis-active-1");
      expect(checkOutLogs).toHaveLength(1);
      expect(checkOutLogs[0].appointRecordIdRevoked).toBe("hc-rec-alice");
    });

    it("throws error when recording tap for non-active visit", async () => {
      await expect(
        service.recordTapAndEnforceQuota(
          "non-existent",
          {
            visitId: "non-existent",
            doorIndexCode: "door-1",
            direction: "in",
            tappedAtUtc: "2026-11-13T10:00:00Z",
          },
          { mode: "stub" },
        ),
      ).rejects.toThrow(/not found/i);
    });
  });

  describe("performCheckOut", () => {
    it("successfully checks out a visit and calls HikCentral checkout adapter", async () => {
      const res = await service.performCheckOut(
        "vis-active-1",
        {
          visitId: "vis-active-1",
          operatorUserId: "usr-sec-01",
          operatorName: "Security Chief",
          reason: "Scheduled departure",
          isForced: false,
        },
        { mode: "stub" },
      );

      expect(res.ok).toBe(true);
      expect(res.visit?.status).toBe("CHECKED_OUT");
      expect(res.visit?.checkOutReason).toBe("Scheduled departure");
      expect(res.visit?.isForcedCheckOut).toBe(false);

      const audit = await repo.listCheckOutEvents("vis-active-1");
      expect(audit).toHaveLength(1);
      expect(audit[0].operatorUserId).toBe("usr-sec-01");
    });

    it("supports forced check-out with security reason", async () => {
      const res = await service.performCheckOut(
        "vis-active-2",
        {
          visitId: "vis-active-2",
          operatorUserId: "usr-sec-02",
          operatorName: "Officer Herman",
          reason: "Security escort out: policy violation",
          isForced: true,
        },
        { mode: "stub" },
      );

      expect(res.ok).toBe(true);
      expect(res.visit?.status).toBe("CHECKED_OUT");
      expect(res.visit?.isForcedCheckOut).toBe(true);
      expect(res.visit?.checkOutReason).toBe("Security escort out: policy violation");
    });

    it("throws error when visit is not in CHECKED_IN status", async () => {
      // Check out alice first
      await service.performCheckOut(
        "vis-active-1",
        {
          visitId: "vis-active-1",
          operatorUserId: "usr-sec-01",
          isForced: false,
        },
        { mode: "stub" },
      );

      // Attempting to check out again should fail
      await expect(
        service.performCheckOut(
          "vis-active-1",
          {
            visitId: "vis-active-1",
            operatorUserId: "usr-sec-01",
            isForced: false,
          },
          { mode: "stub" },
        ),
      ).rejects.toThrow(/not currently checked in/i);
    });
    it("allows check-out of an OVERSTAY visit", async () => {
      // Transition Alice to OVERSTAY
      await repo.updateVisit("vis-active-1", { status: "OVERSTAY" });

      const res = await service.performCheckOut(
        "vis-active-1",
        {
          visitId: "vis-active-1",
          operatorUserId: "sec-guard-01",
          operatorName: "Security Officer",
          reason: "Overstay departure completed",
          isForced: false,
          mode: "stub",
        },
      );

      expect(res.ok).toBe(true);
      expect(res.visit?.status).toBe("CHECKED_OUT");
    });
  });
});
