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

    describe("door directionality & perimeter crossings (Ticket 01)", () => {
      it("rejects manual 'out' tap on a SINGLE_DIRECTION_IN door", async () => {
        await expect(
          service.recordTapAndEnforceQuota(
            "vis-active-2",
            {
              visitId: "vis-active-2",
              doorIndexCode: "door-jkt-dc-01",
              doorName: "DC Server Room 01",
              direction: "out",
              tappedAtUtc: "2026-11-13T09:15:00.000Z",
            },
            { mode: "stub" },
          ),
        ).rejects.toThrow(/SINGLE_DIRECTION_IN/i);
      });

      it("allows 'in' tap on a SINGLE_DIRECTION_IN door and flags perimeter crossing correctly", async () => {
        // Perimeter tap on turnstile
        const perimRes = await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-turnstile-1",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:10:00.000Z",
          },
          { mode: "stub" },
        );
        expect(perimRes.event.isPerimeter).toBe(true);
        expect(perimRes.event.inAndOutType).toBe(1);

        // Single-direction interior room tap
        const roomRes = await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-dc-01",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:20:00.000Z",
          },
          { mode: "stub" },
        );
        expect(roomRes.event.isPerimeter).toBe(false);
        expect(roomRes.event.doorName).toBe("DC Server Room 01");
        expect(roomRes.event.inAndOutType).toBe(1);
      });
    });

    describe("implicit room transitions (Ticket 01)", () => {
      it("logs implicit departure from single-direction door when scanning into a different room without depleting tap quota", async () => {
        // Step 1: Bob enters single-direction DC Server Room 01 (tapCount becomes 1)
        const tap1 = await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-dc-01",
            doorName: "DC Server Room 01",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:20:00.000Z",
          },
          { mode: "stub" },
        );
        expect(tap1.tapCount).toBe(1);
        expect(tap1.visit.lastSeenDoor?.doorIndexCode).toBe("door-jkt-dc-01");
        expect(tap1.visit.lastSeenDoor?.direction).toBe("in");
        expect(tap1.visit.lastSeenDoor?.accessType).toBe("SINGLE_DIRECTION_IN");

        // Step 2: Bob scans into Boardroom East Access (a different room)
        const tap2 = await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-br-east",
            doorName: "Boardroom East Access",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:40:00.000Z",
          },
          { mode: "stub" },
        );

        // Tap count increments only once for the physical tap (now 2), NOT for the implicit exit!
        expect(tap2.tapCount).toBe(2);
        expect(tap2.visit.lastSeenDoor?.doorIndexCode).toBe("door-jkt-br-east");
        expect(tap2.visit.lastSeenDoor?.doorName).toBe("Boardroom East Access");

        // Step 3: Inspect event history - verify implicit departure event was logged
        const events = await repo.listDoorTapEvents("vis-active-2");
        expect(events).toHaveLength(3);

        // Sorted descending by tappedAtUtc: [New Entry, Implicit Exit, Old Entry]
        const entryBoardroom = events.find((e) => e.doorIndexCode === "door-jkt-br-east");
        const implicitExit = events.find((e) => e.doorIndexCode === "door-jkt-dc-01" && e.direction === "out");
        const entryDc = events.find((e) => e.doorIndexCode === "door-jkt-dc-01" && e.direction === "in");

        expect(entryBoardroom).toBeDefined();
        expect(entryBoardroom?.direction).toBe("in");

        expect(implicitExit).toBeDefined();
        expect(implicitExit?.isImplicit).toBe(true);
        expect(implicitExit?.implicit).toBe(true);
        expect(implicitExit?.direction).toBe("out");
        expect(implicitExit?.inAndOutType).toBe(2);
        expect(implicitExit?.transitionNote).toMatch(/implicit departure from dc server room 01 upon entry to boardroom east access/i);

        expect(entryDc).toBeDefined();
        expect(entryDc?.direction).toBe("in");
      });

      it("does NOT log implicit departure when transitioning from a DUAL_DIRECTION door", async () => {
        // Step 1: Alice taps into Lobby Main SpeedGate A (DUAL_DIRECTION)
        await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-turnstile-1",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:10:00.000Z",
          },
          { mode: "stub" },
        );

        // Step 2: Alice taps into 3F Elevator Lobby Door
        await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-3f-el",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:15:00.000Z",
          },
          { mode: "stub" },
        );

        const events = await repo.listDoorTapEvents("vis-active-2");
        expect(events).toHaveLength(2);
        expect(events.some((e) => e.isImplicit || e.implicit)).toBe(false);
      });

      it("does NOT log implicit departure when scanning the same single-direction door again", async () => {
        // Re-tapping into same room
        await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-dc-01",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:20:00.000Z",
          },
          { mode: "stub" },
        );

        await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-dc-01",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:25:00.000Z",
          },
          { mode: "stub" },
        );

        const events = await repo.listDoorTapEvents("vis-active-2");
        expect(events).toHaveLength(2);
        expect(events.some((e) => e.isImplicit || e.implicit)).toBe(false);
      });

      it("enriches ActiveVisitSummary with lastSeenDoor metadata", async () => {
        await service.recordTapAndEnforceQuota(
          "vis-active-2",
          {
            visitId: "vis-active-2",
            doorIndexCode: "door-jkt-dc-01",
            direction: "in",
            tappedAtUtc: "2026-11-13T09:30:00.000Z",
          },
          { mode: "stub" },
        );

        const summaries = await service.getActiveVisits("fac-bali");
        const bob = summaries.find((s) => s.visitId === "vis-active-2");
        expect(bob?.lastSeenDoor).toBeDefined();
        expect(bob?.lastSeenDoor?.doorIndexCode).toBe("door-jkt-dc-01");
        expect(bob?.lastSeenDoor?.doorName).toBe("DC Server Room 01");
        expect(bob?.lastSeenDoor?.accessType).toBe("SINGLE_DIRECTION_IN");
        expect(bob?.lastSeenDoor?.direction).toBe("in");
      });
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

  describe("Emergency Access Escalation (Ticket 03)", () => {
    const restrictedVisit: Visit = {
      id: "vis-restricted-1",
      facilityId: "fac-jakarta",
      visitorGivenName: "Bruce",
      visitorFamilyName: "Wayne",
      visitReasonType: 3,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T12:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T19:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 0,
      accessLevelIds: ["acc-jkt-lobby"],
      hikCentral: {
        appointRecordId: "hc-rec-bruce",
        visitorId: "hc-vis-bruce",
      },
      createdAtUtc: "2026-11-13T07:30:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    beforeEach(async () => {
      await repo.saveVisit(restrictedVisit);
    });

    describe("grantEmergencyAccess", () => {
      it("grants emergency access to an active visit, resolves door names, and synchronizes hardware", async () => {
        const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        const res = await service.grantEmergencyAccess(
          "vis-restricted-1",
          {
            doorIndexCodes: ["door-jkt-dc-01"],
            grantedByUserId: "sec-officer-99",
            grantedByName: "Officer James",
            reason: "Critical server rack fiber repair",
            expiresAtUtc: futureDate,
          },
          { mode: "stub" },
        );

        expect(res.grant).toBeDefined();
        expect(res.grant.status).toBe("ACTIVE");
        expect(res.grant.doorIndexCodes).toEqual(["door-jkt-dc-01"]);
        expect(res.grant.doorNames).toContain("DC Server Room 01");
        expect(res.grant.grantedByUserId).toBe("sec-officer-99");
        expect(res.grant.reason).toBe("Critical server rack fiber repair");

        // Verify active monitoring summary includes the emergency grant
        const summaries = await service.getActiveVisits("fac-jakarta");
        const bruce = summaries.find((s) => s.visitId === "vis-restricted-1");
        expect(bruce?.emergencyGrants).toHaveLength(1);
        expect(bruce?.emergencyGrants?.[0].doorIndexCodes).toContain("door-jkt-dc-01");
      });

      it("grants emergency access to an OVERSTAY visit", async () => {
        await repo.updateVisit("vis-restricted-1", { status: "OVERSTAY" });

        const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
        const res = await service.grantEmergencyAccess(
          "vis-restricted-1",
          {
            doorIndexCodes: ["door-jkt-dc-01"],
            grantedByUserId: "sec-officer-99",
            reason: "Urgent power backup maintenance during overstay",
            expiresAtUtc: futureDate,
          },
          { mode: "stub" },
        );

        expect(res.grant.status).toBe("ACTIVE");
      });

      it("rejects emergency grant when visit is not active", async () => {
        await repo.updateVisit("vis-restricted-1", { status: "CHECKED_OUT" });

        await expect(
          service.grantEmergencyAccess(
            "vis-restricted-1",
            {
              doorIndexCodes: ["door-jkt-dc-01"],
              grantedByUserId: "sec-officer-99",
              reason: "Late emergency request",
              expiresAtUtc: new Date(Date.now() + 3600 * 1000).toISOString(),
            },
            { mode: "stub" },
          ),
        ).rejects.toThrow(/must be 'CHECKED_IN' or 'OVERSTAY'/i);
      });

      it("rejects emergency grant when reason is shorter than 10 characters", async () => {
        await expect(
          service.grantEmergencyAccess(
            "vis-restricted-1",
            {
              doorIndexCodes: ["door-jkt-dc-01"],
              grantedByUserId: "sec-officer-99",
              reason: "Short",
              expiresAtUtc: new Date(Date.now() + 3600 * 1000).toISOString(),
            },
            { mode: "stub" },
          ),
        ).rejects.toThrow(/at least 10 characters/i);
      });

      it("propagates HikCentral upstream errors during sync", async () => {
        await expect(
          service.grantEmergencyAccess(
            "vis-restricted-1",
            {
              doorIndexCodes: ["door-jkt-dc-01"],
              grantedByUserId: "sec-officer-99",
              reason: "Emergency data recovery in server vault",
              expiresAtUtc: new Date(Date.now() + 3600 * 1000).toISOString(),
            },
            { mode: "stub", stubScenario: "auth-error" },
          ),
        ).rejects.toThrow(/appKey does not exist/i);
      });
    });

    describe("revokeEmergencyAccess", () => {
      it("manually revokes an active grant before expiration", async () => {
        const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        const grantRes = await service.grantEmergencyAccess(
          "vis-restricted-1",
          {
            doorIndexCodes: ["door-jkt-dc-01"],
            grantedByUserId: "sec-officer-99",
            reason: "Temporary investigation of alarm",
            expiresAtUtc: futureDate,
          },
          { mode: "stub" },
        );

        const revokeRes = await service.revokeEmergencyAccess(
          "vis-restricted-1",
          grantRes.grant.id,
          "sec-officer-100",
          "Supervisor Sarah",
          { mode: "stub" },
        );

        expect(revokeRes.grant.status).toBe("REVOKED");
        expect(revokeRes.grant.revokedByUserId).toBe("sec-officer-100");
        expect(revokeRes.grant.revokedByName).toBe("Supervisor Sarah");
        expect(revokeRes.grant.revokedAtUtc).toBeDefined();

        // Active grants on visit summary should now be empty
        const summaries = await service.getActiveVisits("fac-jakarta");
        const bruce = summaries.find((s) => s.visitId === "vis-restricted-1");
        expect(bruce?.emergencyGrants).toHaveLength(0);
      });
    });

    describe("door tap access evaluation", () => {
      it("allows taps on access level doors but denies taps on unauthorized doors", async () => {
        // Door in acc-jkt-lobby ("Lobby Main SpeedGate A" / door-turnstile-1)
        const lobbyTap = await service.recordTapAndEnforceQuota(
          "vis-restricted-1",
          {
            visitId: "vis-restricted-1",
            doorIndexCode: "door-turnstile-1",
            doorName: "Lobby Main SpeedGate A",
            direction: "in",
            tappedAtUtc: "2026-11-13T08:10:00.000Z",
          },
          { mode: "stub" },
        );
        expect(lobbyTap.tapCount).toBe(1);

        // Door NOT in acc-jkt-lobby ("DC Server Room 01" / door-jkt-dc-01)
        await expect(
          service.recordTapAndEnforceQuota(
            "vis-restricted-1",
            {
              visitId: "vis-restricted-1",
              doorIndexCode: "door-jkt-dc-01",
              doorName: "DC Server Room 01",
              direction: "in",
              tappedAtUtc: "2026-11-13T08:15:00.000Z",
            },
            { mode: "stub" },
          ),
        ).rejects.toThrow(/access denied/i);
      });

      it("allows taps on unauthorized doors while an emergency access grant is ACTIVE", async () => {
        const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        await service.grantEmergencyAccess(
          "vis-restricted-1",
          {
            doorIndexCodes: ["door-jkt-dc-01"],
            grantedByUserId: "sec-officer-99",
            reason: "Authorized emergency server room maintenance",
            expiresAtUtc: futureDate,
          },
          { mode: "stub" },
        );

        // Now tapping DC Server Room 01 succeeds!
        const tapRes = await service.recordTapAndEnforceQuota(
          "vis-restricted-1",
          {
            visitId: "vis-restricted-1",
            doorIndexCode: "door-jkt-dc-01",
            doorName: "DC Server Room 01",
            direction: "in",
            tappedAtUtc: new Date().toISOString(),
          },
          { mode: "stub" },
        );

        expect(tapRes.tapCount).toBe(1);
        expect(tapRes.event.doorIndexCode).toBe("door-jkt-dc-01");
      });

      it("denies access after emergency grant has expired or is manually revoked", async () => {
        const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        const grantRes = await service.grantEmergencyAccess(
          "vis-restricted-1",
          {
            doorIndexCodes: ["door-jkt-dc-01"],
            grantedByUserId: "sec-officer-99",
            reason: "Short inspection of server racks",
            expiresAtUtc: futureDate,
          },
          { mode: "stub" },
        );

        // Manually revoke the grant
        await service.revokeEmergencyAccess(
          "vis-restricted-1",
          grantRes.grant.id,
          "sec-officer-99",
          "Officer",
          { mode: "stub" },
        );

        // Tapping should now be denied
        await expect(
          service.recordTapAndEnforceQuota(
            "vis-restricted-1",
            {
              visitId: "vis-restricted-1",
              doorIndexCode: "door-jkt-dc-01",
              doorName: "DC Server Room 01",
              direction: "in",
              tappedAtUtc: new Date().toISOString(),
            },
            { mode: "stub" },
          ),
        ).rejects.toThrow(/access denied/i);
      });
    });

    describe("check-out auto-revocation", () => {
      it("automatically revokes all active emergency grants upon visit check-out", async () => {
        const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        await service.grantEmergencyAccess(
          "vis-restricted-1",
          {
            doorIndexCodes: ["door-jkt-dc-01"],
            grantedByUserId: "sec-officer-99",
            reason: "Urgent check-out test grant",
            expiresAtUtc: futureDate,
          },
          { mode: "stub" },
        );

        // Check out the visit
        const checkOutRes = await service.performCheckOut(
          "vis-restricted-1",
          {
            visitId: "vis-restricted-1",
            operatorUserId: "sec-guard-01",
            operatorName: "Guard Officer",
            reason: "Work completed early",
            isForced: false,
          },
          { mode: "stub" },
        );

        expect(checkOutRes.ok).toBe(true);
        expect(checkOutRes.visit?.status).toBe("CHECKED_OUT");

        // Verify emergency grants are now REVOKED in repository
        const grants = await repo.getEmergencyGrants("vis-restricted-1");
        expect(grants).toHaveLength(1);
        expect(grants[0].status).toBe("REVOKED");
      });
    });
  });
});
