import { describe, expect, it, beforeEach } from "vitest";
import { POST as postPreRegistration } from "@/app/api/vms/pre-registration/route";
import { POST as postApprovalDecision } from "@/app/api/vms/approvals/[visitId]/route";
import { POST as postDoorTap } from "@/app/api/vms/active-visits/[visitId]/tap/route";
import { POST as postEmergencyAccess } from "@/app/api/vms/active-visits/[visitId]/emergency-access/route";
import { POST as postCheckOut } from "@/app/api/vms/active-visits/[visitId]/check-out/route";
import { GET as getActiveVisits } from "@/app/api/vms/active-visits/route";
import { defaultVmsRepository, TEST_FIXTURE_DOORS } from "@/lib/vms/repository";
import {
  createSampleFaceJpegDataUri,
  normalizeFaceImage,
} from "@/lib/vms/face-normalizer";
import type { PreRegistrationResult } from "@/lib/vms/vms-contract";

describe("E2E Tracer Bullet: Access Enhancements & Hardware Failure Resilience", () => {
  beforeEach(async () => {
    // Ensure default test doors, access levels, and facilities are in known state
    await defaultVmsRepository.saveDoors(TEST_FIXTURE_DOORS);
    const jktLobby = await defaultVmsRepository.getAccessLevel("acc-jkt-lobby");
    if (jktLobby) {
      await defaultVmsRepository.saveAccessLevel({
        ...jktLobby,
        doors: [
          "Lobby Main SpeedGate A",
          "Lobby Main SpeedGate B",
          "Visitor Turnstile 01",
        ],
      });
    }
  });

  it("executes the complete tracer-bullet lifecycle: auto check-in -> room transitions -> emergency access -> check-out", async () => {
    // -------------------------------------------------------------------------
    // Phase 1: Create a Pre-Approved Visit with Biometrics & Standard Access
    // -------------------------------------------------------------------------
    const sampleFace = createSampleFaceJpegDataUri(18000);
    const normalizedFace = await normalizeFaceImage(sampleFace);

    const preRegPayload = {
      facilityId: "fac-jakarta",
      hostId: "emp-host-01",
      hostName: "Rudi Host",
      visitorFamilyName: "Pratama",
      visitorGivenName: "Arya",
      visitorPhone: "+6281234567890",
      visitorEmail: "arya.pratama@example.com",
      certificateType: 111, // KTP
      certificateNo: "3171098765430005",
      visitReasonType: 3, // Meeting
      scheduledStartTime: "2026-11-20T10:00:00",
      scheduledEndTime: "2026-11-20T12:00:00",
      facePhoto: normalizedFace.dataUri,
      accessLevelIds: ["acc-jkt-lobby", "acc-jkt-exec"],
      tapQuota: {
        mode: "limited",
        maxTaps: 10,
      },
      mode: "stub",
      stubScenario: "success",
    };

    const preRegReq = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preRegPayload),
    });

    const preRegRes = await postPreRegistration(preRegReq);
    expect(preRegRes.status).toBe(201);
    const preRegBody = (await preRegRes.json()) as PreRegistrationResult;
    expect(preRegBody.ok).toBe(true);

    const visitId = preRegBody.visit!.id;
    expect(preRegBody.visit!.status).toBe("PENDING_APPROVAL");
    expect(preRegBody.visit!.scheduledStartTimeUtc).toBe("2026-11-20T03:00:00.000Z");
    expect(preRegBody.visit!.scheduledEndTimeUtc).toBe("2026-11-20T05:00:00.000Z");

    // Manager / Security Approver reviews and approves visit
    const approveReq = new Request(
      `http://localhost:3000/api/vms/approvals/${visitId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          comment: "Pre-approved for technical briefing and meeting in boardroom.",
          approverName: "Budi Santoso",
          approverRole: "Department Manager",
        }),
      },
    );

    const approveRes = await postApprovalDecision(approveReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(approveRes.status).toBe(200);
    const approveBody = await approveRes.json();
    expect(approveBody.ok).toBe(true);
    expect(approveBody.data.visit.status).toBe("APPROVED");
    expect(approveBody.data.visit.credentialSyncStatus).toBe("Applied");
    expect(approveBody.data.visit.tapCount ?? 0).toBe(0);

    // -------------------------------------------------------------------------
    // Phase 2: Touchless Fast-Track Auto Check-In on First Perimeter Tap
    // -------------------------------------------------------------------------
    // Visitor arrives 8 minutes before 10:00 WIB (02:52 UTC) and scans at turnstile
    const firstTapTimeUtc = "2026-11-20T02:52:00.000Z";
    const initialWebhookId = "wh-tap-event-001";

    const turnstileTapReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialWebhookId,
          doorIndexCode: "door-turnstile-main",
          direction: "in",
          isPerimeter: true,
          tappedAtUtc: firstTapTimeUtc,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const turnstileTapRes = await postDoorTap(turnstileTapReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(turnstileTapRes.status).toBe(200);

    const turnstileTapBody = await turnstileTapRes.json();
    expect(turnstileTapBody.ok).toBe(true);
    expect(turnstileTapBody.autoCheckedIn).toBe(true);
    expect(turnstileTapBody.tapCount).toBe(1);
    expect(turnstileTapBody.remainingTaps).toBe(9);
    expect(turnstileTapBody.visit.status).toBe("CHECKED_IN");
    expect(turnstileTapBody.visit.actualCheckInTimeUtc).toBe(firstTapTimeUtc);
    expect(turnstileTapBody.visit.isFastTrack).toBe(true);
    expect(turnstileTapBody.event.doorName).toBe("Visitor Turnstile 01");
    expect(turnstileTapBody.event.isPerimeter).toBe(true);

    // Verify host notification generated automatically
    expect(turnstileTapBody.hostNotification).toBeDefined();
    expect(turnstileTapBody.hostNotification.hostId).toBe("emp-host-01");
    expect(turnstileTapBody.hostNotification.visitorName).toBe("Arya Pratama");
    expect(turnstileTapBody.hostNotification.message).toMatch(
      /completed touchless check-in/i,
    );

    // Verify presence in active monitoring dashboard
    const activeMonitoringReq = new Request(
      "http://localhost:3000/api/vms/active-visits?facilityId=fac-jakarta",
    );
    const activeMonitoringRes = await getActiveVisits(activeMonitoringReq);
    expect(activeMonitoringRes.status).toBe(200);
    const activeMonitoringBody = await activeMonitoringRes.json();
    expect(activeMonitoringBody.ok).toBe(true);
    const monitoredVisit = activeMonitoringBody.activeVisits.find(
      (v: { visitId: string }) => v.visitId === visitId,
    );
    expect(monitoredVisit).toBeDefined();
    expect(monitoredVisit.isFastTrack).toBe(true);
    expect(monitoredVisit.tapCount).toBe(1);
    expect(monitoredVisit.lastSeenDoor.doorIndexCode).toBe("door-turnstile-main");

    // -------------------------------------------------------------------------
    // Phase 2b: Duplicate Webhook Idempotency Verification
    // -------------------------------------------------------------------------
    // Re-delivering exact same webhook tap event with initialWebhookId
    const dupWebhookReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialWebhookId,
          doorIndexCode: "door-turnstile-main",
          direction: "in",
          isPerimeter: true,
          tappedAtUtc: firstTapTimeUtc,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const dupWebhookRes = await postDoorTap(dupWebhookReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(dupWebhookRes.status).toBe(200);
    const dupWebhookBody = await dupWebhookRes.json();
    expect(dupWebhookBody.ok).toBe(true);
    // Duplicate does not re-trigger check-in and does not increment tapCount
    expect(dupWebhookBody.autoCheckedIn).toBe(false);
    expect(dupWebhookBody.tapCount).toBe(1);
    expect(dupWebhookBody.visit.actualCheckInTimeUtc).toBe(firstTapTimeUtc);

    // Subsequent passage tap at turnstile later in the morning
    const secondPassageTimeUtc = "2026-11-20T03:05:00.000Z";
    const secondPassageReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-turnstile-main",
          direction: "in",
          isPerimeter: true,
          tappedAtUtc: secondPassageTimeUtc,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const secondPassageRes = await postDoorTap(secondPassageReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(secondPassageRes.status).toBe(200);
    const secondPassageBody = await secondPassageRes.json();
    expect(secondPassageBody.ok).toBe(true);
    expect(secondPassageBody.autoCheckedIn).toBe(false);
    expect(secondPassageBody.tapCount).toBe(2);
    // actualCheckInTimeUtc MUST remain the initial check-in time
    expect(secondPassageBody.visit.actualCheckInTimeUtc).toBe(firstTapTimeUtc);

    // -------------------------------------------------------------------------
    // Phase 3: Single-Direction Room Implicit Departure & Transition
    // -------------------------------------------------------------------------
    // Step 3a: Visitor taps into single-direction Room A: Boardroom East Access (door-jkt-br-east)
    const roomATapTime = "2026-11-20T03:15:00.000Z";
    const roomATapReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-jkt-br-east",
          doorName: "Boardroom East Access",
          direction: "in",
          tappedAtUtc: roomATapTime,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const roomATapRes = await postDoorTap(roomATapReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(roomATapRes.status).toBe(200);
    const roomATapBody = await roomATapRes.json();
    expect(roomATapBody.ok).toBe(true);
    expect(roomATapBody.tapCount).toBe(3); // physical tap 3
    expect(roomATapBody.visit.lastSeenDoor?.doorIndexCode).toBe("door-jkt-br-east");
    expect(roomATapBody.visit.lastSeenDoor?.doorName).toBe("Boardroom East Access");
    expect(roomATapBody.visit.lastSeenDoor?.accessType).toBe("SINGLE_DIRECTION_IN");

    // Verify rejection of illegal manual exit on SINGLE_DIRECTION_IN door
    const illegalExitReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-jkt-br-east",
          direction: "out",
          tappedAtUtc: "2026-11-20T03:30:00.000Z",
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );
    const illegalExitRes = await postDoorTap(illegalExitReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(illegalExitRes.status).toBe(400);
    const illegalExitBody = await illegalExitRes.json();
    expect(illegalExitBody.ok).toBe(false);
    expect(illegalExitBody.error.message).toMatch(/SINGLE_DIRECTION_IN/i);

    // Step 3b: Visitor exits Room A via push button and taps into Room B: 3F Elevator Lobby Door
    const roomBTapTime = "2026-11-20T03:35:00.000Z";
    const roomBTapReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-jkt-3f-el",
          doorName: "3F Elevator Lobby Door",
          direction: "in",
          tappedAtUtc: roomBTapTime,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const roomBTapRes = await postDoorTap(roomBTapReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(roomBTapRes.status).toBe(200);
    const roomBTapBody = await roomBTapRes.json();
    expect(roomBTapBody.ok).toBe(true);

    // Quota tapCount should ONLY increment by 1 for physical entry to Room B (now 4, not 5!)
    expect(roomBTapBody.tapCount).toBe(4);
    expect(roomBTapBody.remainingTaps).toBe(6);
    expect(roomBTapBody.visit.lastSeenDoor?.doorIndexCode).toBe("door-jkt-3f-el");

    // Inspect repository audit events to verify implicit departure breadcrumb was logged
    const tapHistory = await defaultVmsRepository.listDoorTapEvents(visitId);
    const implicitExitBreadcrumb = tapHistory.find(
      (e) =>
        e.doorIndexCode === "door-jkt-br-east" &&
        e.direction === "out" &&
        (e.isImplicit === true || e.implicit === true),
    );
    expect(implicitExitBreadcrumb).toBeDefined();
    expect(implicitExitBreadcrumb?.transitionNote).toMatch(
      /implicit departure from boardroom east access upon entry to 3f elevator lobby door/i,
    );

    // -------------------------------------------------------------------------
    // Phase 4: Emergency Access Escalation & Hardware Controller Sync
    // -------------------------------------------------------------------------
    // Step 4a: Visitor attempts tap on restricted DC Server Room 01 (outside their access level)
    const restrictedTapReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-jkt-dc-01",
          doorName: "DC Server Room 01",
          direction: "in",
          tappedAtUtc: "2026-11-20T03:40:00.000Z",
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const restrictedTapRes = await postDoorTap(restrictedTapReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(restrictedTapRes.status).toBe(403);
    const restrictedTapBody = await restrictedTapRes.json();
    expect(restrictedTapBody.ok).toBe(false);
    expect(restrictedTapBody.error.kind).toBe("forbidden");
    expect(restrictedTapBody.error.message).toMatch(/access denied/i);

    // Step 4b: Security Officer grants time-bounded Emergency Access (2 hours)
    const grantExpiryTimeUtc = new Date(
      new Date("2026-11-20T03:45:00.000Z").getTime() + 2 * 3600 * 1000,
    ).toISOString();

    const emergencyGrantReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCodes: ["door-jkt-dc-01"],
          doorNames: ["DC Server Room 01"],
          durationHours: 2,
          expiresAtUtc: grantExpiryTimeUtc,
          reason: "Emergency HVAC inspection on critical server row B in DC Server Room 01",
          grantedByUserId: "sec-officer-01",
          grantedByName: "Officer Bambang",
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const emergencyGrantRes = await postEmergencyAccess(emergencyGrantReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(emergencyGrantRes.status).toBe(201);
    const emergencyGrantBody = await emergencyGrantRes.json();
    expect(emergencyGrantBody.ok).toBe(true);
    expect(emergencyGrantBody.grant.status).toBe("ACTIVE");
    expect(emergencyGrantBody.grant.doorIndexCodes).toEqual(["door-jkt-dc-01"]);
    expect(emergencyGrantBody.grant.grantedByUserId).toBe("sec-officer-01");
    expect(emergencyGrantBody.grant.reason).toContain("Emergency HVAC inspection");

    // Verify grant is saved in repository
    const storedGrants = await defaultVmsRepository.getEmergencyGrants(visitId);
    expect(storedGrants.some((g) => g.id === emergencyGrantBody.grant.id && g.status === "ACTIVE")).toBe(true);

    // Step 4c: Visitor taps again into DC Server Room 01 -> Now Permitted!
    const emergencyDoorTapReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/tap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-jkt-dc-01",
          doorName: "DC Server Room 01",
          direction: "in",
          tappedAtUtc: "2026-11-20T03:46:00.000Z",
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const emergencyDoorTapRes = await postDoorTap(emergencyDoorTapReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(emergencyDoorTapRes.status).toBe(200);
    const emergencyDoorTapBody = await emergencyDoorTapRes.json();
    expect(emergencyDoorTapBody.ok).toBe(true);
    expect(emergencyDoorTapBody.tapCount).toBe(5);
    expect(emergencyDoorTapBody.visit.lastSeenDoor?.doorIndexCode).toBe("door-jkt-dc-01");

    // -------------------------------------------------------------------------
    // Phase 5: Check-Out & Automatic Hardware De-Authorization
    // -------------------------------------------------------------------------
    const checkOutTimeUtc = "2026-11-20T04:15:00.000Z";
    const checkOutReq = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/check-out`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorUserId: "sec-officer-01",
          operatorName: "Officer Bambang",
          reason: "Scheduled departure and completion of emergency inspection",
          isForced: false,
          checkOutTimeUtc,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const checkOutRes = await postCheckOut(checkOutReq, {
      params: Promise.resolve({ visitId }),
    });
    expect(checkOutRes.status).toBe(200);
    const checkOutBody = await checkOutRes.json();
    expect(checkOutBody.ok).toBe(true);
    expect(checkOutBody.visit.status).toBe("CHECKED_OUT");
    expect(checkOutBody.visit.actualCheckOutTimeUtc).toBe(checkOutTimeUtc);

    // Verify all active emergency grants were automatically REVOKED
    const finalGrants = await defaultVmsRepository.getEmergencyGrants(visitId);
    expect(finalGrants.length).toBeGreaterThanOrEqual(1);
    for (const grant of finalGrants) {
      expect(grant.status).toBe("REVOKED");
      expect(grant.revokedAtUtc).toBeDefined();
    }

    // Verify checked out visitor no longer appears in active occupancy
    const postCheckOutMonitoring = await getActiveVisits(activeMonitoringReq);
    const activeList = (await postCheckOutMonitoring.json()).activeVisits;
    expect(activeList.some((v: { visitId: string }) => v.visitId === visitId)).toBe(false);
  });

  describe("Hardware Failure Resilience: Upstream HikCentral Errors", () => {
    let resilientVisitId: string;

    beforeEach(async () => {
      // Create a fresh checked-in visit in Jakarta
      const newVisitId = `vis-resilience-${Date.now()}`;
      await defaultVmsRepository.saveVisit({
        id: newVisitId,
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
        visitorGivenName: "Devi",
        visitorFamilyName: "Sari",
        visitorPhone: "+6281987654321",
        certificateNo: "3171000000000099",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T08:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-20T12:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-20T15:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T19:00:00+07:00",
        actualCheckInTimeUtc: "2026-11-20T08:05:00.000Z",
        status: "CHECKED_IN",
        tapCount: 1,
        accessLevelIds: ["acc-jkt-lobby"],
        tapQuota: { mode: "unlimited" },
        createdAtUtc: "2026-11-20T07:30:00.000Z",
        updatedAtUtc: "2026-11-20T08:05:00.000Z",
      });
      resilientVisitId = newVisitId;
    });

    it("handles HikCentral upstream network timeout failure without crashing or corrupting state", async () => {
      const networkFailPayload = {
        doorIndexCodes: ["door-jkt-dc-01"],
        doorNames: ["DC Server Room 01"],
        durationHours: 2,
        grantedAtUtc: "2026-11-20T08:10:00.000Z",
        expiresAtUtc: "2026-11-20T10:10:00.000Z",
        reason: "Urgent power generator inspection and rack cable check",
        grantedByUserId: "sec-officer-02",
        grantedByName: "Officer Joko",
        mode: "stub",
        stubScenario: "network-error",
      };

      const failReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/emergency-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(networkFailPayload),
        },
      );

      const failRes = await postEmergencyAccess(failReq, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });

      // Upstream gateway error returned cleanly with status 502
      expect(failRes.status).toBe(502);
      const failBody = await failRes.json();
      expect(failBody.ok).toBe(false);
      expect(failBody.error.kind).toBe("upstream");
      expect(failBody.error.message).toMatch(/connect ECONNREFUSED|network failure/i);

      // Verify no phantom active grant was saved in repository (state integrity preserved!)
      const grants = await defaultVmsRepository.getEmergencyGrants(resilientVisitId);
      expect(grants.filter((g) => g.status === "ACTIVE")).toHaveLength(0);

      // Verify that visitor tap on restricted door remains forbidden (hardware sync did not succeed)
      const tapAttempt = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/tap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCode: "door-jkt-dc-01",
            doorName: "DC Server Room 01",
            direction: "in",
            tappedAtUtc: "2026-11-20T08:15:00.000Z",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );

      const tapRes = await postDoorTap(tapAttempt, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });
      expect(tapRes.status).toBe(403);

      // Now operator retries with network resolved (success scenario)
      const retryReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/emergency-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...networkFailPayload,
            stubScenario: "success",
          }),
        },
      );

      const retryRes = await postEmergencyAccess(retryReq, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });
      expect(retryRes.status).toBe(201);
      const retryBody = await retryRes.json();
      expect(retryBody.ok).toBe(true);
      expect(retryBody.grant.status).toBe("ACTIVE");

      // Now door tap succeeds
      const successfulTapAttempt = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/tap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCode: "door-jkt-dc-01",
            doorName: "DC Server Room 01",
            direction: "in",
            tappedAtUtc: "2026-11-20T08:16:00.000Z",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );

      const successfulTapRes = await postDoorTap(successfulTapAttempt, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });
      expect(successfulTapRes.status).toBe(200);
    });

    it("handles HikCentral upstream authentication failure and sanitizes internal secrets", async () => {
      const authFailPayload = {
        doorIndexCodes: ["door-jkt-dc-01"],
        durationHours: 2,
        grantedAtUtc: "2026-11-20T08:10:00.000Z",
        expiresAtUtc: "2026-11-20T10:10:00.000Z",
        reason: "Accessing electrical distribution board B",
        grantedByUserId: "sec-officer-02",
        mode: "stub",
        stubScenario: "auth-error",
      };

      const req = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/emergency-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authFailPayload),
        },
      );

      const res = await postEmergencyAccess(req, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });
      expect(res.status).toBe(502);

      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.kind).toBe("upstream");
      expect(body.error.code).toBe("0x00072002");

      const rawJson = JSON.stringify(body);
      expect(rawJson).not.toContain("HIKCENTRAL_APP_SECRET");
      expect(rawJson).not.toContain("password");
    });

    it("handles check-out de-authorization resilience when HikCentral upstream hardware throws error", async () => {
      // First grant active emergency access
      const grantReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/emergency-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCodes: ["door-jkt-dc-01"],
            durationHours: 2,
            grantedAtUtc: "2026-11-20T08:10:00.000Z",
            expiresAtUtc: "2026-11-20T10:10:00.000Z",
            reason: "Inspection before check-out",
            grantedByUserId: "sec-officer-01",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );
      await postEmergencyAccess(grantReq, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });

      // Check-out during upstream network outage:
      // Domain check-out must succeed gracefully and mark grants REVOKED locally
      const checkOutReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${resilientVisitId}/check-out`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operatorUserId: "sec-officer-01",
            reason: "Departure with controller temporarily unreachable",
            mode: "stub",
            stubScenario: "network-error",
          }),
        },
      );

      const checkOutRes = await postCheckOut(checkOutReq, {
        params: Promise.resolve({ visitId: resilientVisitId }),
      });
      expect(checkOutRes.status).toBe(200);
      const checkOutBody = await checkOutRes.json();
      expect(checkOutBody.ok).toBe(true);
      expect(checkOutBody.visit.status).toBe("CHECKED_OUT");

      // Verify grants are REVOKED locally
      const grants = await defaultVmsRepository.getEmergencyGrants(resilientVisitId);
      expect(grants.every((g) => g.status === "REVOKED")).toBe(true);
    });
  });

  describe("Edge Cases & Security Boundary Enforcement", () => {
    it("rejects auto check-in when visitor arrives too early before allowed early arrival buffer", async () => {
      const earlyVisitId = `vis-early-${Date.now()}`;
      await defaultVmsRepository.saveVisit({
        id: earlyVisitId,
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
        visitorGivenName: "Tari",
        visitorFamilyName: "Hapsari",
        visitorPhone: "+6281777888999",
        certificateNo: "3171000000000055",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 0,
        // Scheduled at 10:00 WIB (03:00 UTC)
        scheduledStartTimeUtc: "2026-11-20T03:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-20T05:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-20T10:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T12:00:00+07:00",
        status: "APPROVED",
        accessLevelIds: ["acc-jkt-lobby"],
        tapCount: 0,
        createdAtUtc: "2026-11-20T01:00:00.000Z",
        updatedAtUtc: "2026-11-20T01:00:00.000Z",
      });

      // Visitor attempts to scan 30 minutes before 10:00 (early buffer is 15 minutes)
      const tooEarlyTap = new Request(
        `http://localhost:3000/api/vms/active-visits/${earlyVisitId}/tap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCode: "door-turnstile-main",
            direction: "in",
            isPerimeter: true,
            tappedAtUtc: "2026-11-20T02:30:00.000Z", // 30m prior
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );

      const res = await postDoorTap(tooEarlyTap, {
        params: Promise.resolve({ visitId: earlyVisitId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.kind).toBe("validation");
      expect(body.error.message).toMatch(/Too early for auto check-in/i);
    });

    it("rejects auto check-in when APPROVED visitor attempts to tap an internal door instead of perimeter entrance", async () => {
      const internalVisitId = `vis-internal-${Date.now()}`;
      await defaultVmsRepository.saveVisit({
        id: internalVisitId,
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
        visitorGivenName: "Fajar",
        visitorFamilyName: "Nugroho",
        visitorPhone: "+6281777888111",
        certificateNo: "3171000000000044",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T03:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-20T05:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-20T10:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T12:00:00+07:00",
        status: "APPROVED",
        accessLevelIds: ["acc-jkt-lobby", "acc-jkt-exec"],
        tapCount: 0,
        createdAtUtc: "2026-11-20T01:00:00.000Z",
        updatedAtUtc: "2026-11-20T01:00:00.000Z",
      });

      // Tapping internal 3F elevator door before entering outer perimeter turnstile
      const internalTap = new Request(
        `http://localhost:3000/api/vms/active-visits/${internalVisitId}/tap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCode: "door-jkt-3f-el",
            doorName: "3F Elevator Lobby Door",
            direction: "in",
            tappedAtUtc: "2026-11-20T02:55:00.000Z",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );

      const res = await postDoorTap(internalTap, {
        params: Promise.resolve({ visitId: internalVisitId }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.kind).toBe("validation");
      expect(body.error.message).toMatch(
        /Auto check-in only permitted at designated perimeter entry points/i,
      );
    });

    it("denies door access when emergency access grant has expired past its expiration time", async () => {
      const expiredVisitId = `vis-exp-${Date.now()}`;
      await defaultVmsRepository.saveVisit({
        id: expiredVisitId,
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
        visitorGivenName: "Reza",
        visitorFamilyName: "Rahadian",
        visitorPhone: "+6281777888222",
        certificateNo: "3171000000000033",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T02:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-20T06:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-20T09:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T13:00:00+07:00",
        actualCheckInTimeUtc: "2026-11-20T02:05:00.000Z",
        status: "CHECKED_IN",
        accessLevelIds: ["acc-jkt-lobby"],
        tapCount: 1,
        tapQuota: { mode: "unlimited" },
        createdAtUtc: "2026-11-20T01:00:00.000Z",
        updatedAtUtc: "2026-11-20T02:05:00.000Z",
      });

      // Grant emergency access valid from 02:10 to 03:10 UTC (1 hour)
      const grantReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${expiredVisitId}/emergency-access`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCodes: ["door-jkt-dc-01"],
            doorNames: ["DC Server Room 01"],
            grantedAtUtc: "2026-11-20T02:10:00.000Z",
            expiresAtUtc: "2026-11-20T03:10:00.000Z",
            reason: "Time-limited emergency circuit breaker check",
            grantedByUserId: "sec-officer-01",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );
      const grantRes = await postEmergencyAccess(grantReq, {
        params: Promise.resolve({ visitId: expiredVisitId }),
      });
      expect(grantRes.status).toBe(201);

      // Visitor attempts to tap into DC Server Room at 03:20 UTC (10 mins after expiration!)
      const lateTapReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${expiredVisitId}/tap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCode: "door-jkt-dc-01",
            doorName: "DC Server Room 01",
            direction: "in",
            tappedAtUtc: "2026-11-20T03:20:00.000Z",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );

      const lateTapRes = await postDoorTap(lateTapReq, {
        params: Promise.resolve({ visitId: expiredVisitId }),
      });
      expect(lateTapRes.status).toBe(403);
      const lateTapBody = await lateTapRes.json();
      expect(lateTapBody.ok).toBe(false);
      expect(lateTapBody.error.kind).toBe("forbidden");
      expect(lateTapBody.error.message).toMatch(/access denied/i);
    });

    it("automatically checks out visitor when physical tap quota limit is exhausted", async () => {
      const quotaVisitId = `vis-quota-${Date.now()}`;
      await defaultVmsRepository.saveVisit({
        id: quotaVisitId,
        facilityId: "fac-jakarta",
        facilityName: "Jakarta Corporate HQ",
        visitorGivenName: "Maya",
        visitorFamilyName: "Indah",
        visitorPhone: "+6281777888333",
        certificateNo: "3171000000000022",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T02:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-20T06:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-20T09:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T13:00:00+07:00",
        actualCheckInTimeUtc: "2026-11-20T02:05:00.000Z",
        status: "CHECKED_IN",
        accessLevelIds: ["acc-jkt-lobby"],
        tapCount: 1,
        tapQuota: {
          mode: "limited",
          maxTaps: 2, // strictly 2 taps allotted
        },
        createdAtUtc: "2026-11-20T01:00:00.000Z",
        updatedAtUtc: "2026-11-20T02:05:00.000Z",
      });

      // Second tap (2 of 2 taps): exhausts quota and triggers auto-checkout
      const finalTapReq = new Request(
        `http://localhost:3000/api/vms/active-visits/${quotaVisitId}/tap`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doorIndexCode: "door-turnstile-main",
            doorName: "Visitor Turnstile 01",
            direction: "out",
            tappedAtUtc: "2026-11-20T02:45:00.000Z",
            mode: "stub",
            stubScenario: "success",
          }),
        },
      );

      const finalTapRes = await postDoorTap(finalTapReq, {
        params: Promise.resolve({ visitId: quotaVisitId }),
      });
      expect(finalTapRes.status).toBe(200);
      const finalTapBody = await finalTapRes.json();
      expect(finalTapBody.ok).toBe(true);
      expect(finalTapBody.tapCount).toBe(2);
      expect(finalTapBody.isQuotaExceeded).toBe(true);
      expect(finalTapBody.autoCheckedOut).toBe(true);
      expect(finalTapBody.visit.status).toBe("CHECKED_OUT");
      expect(finalTapBody.visit.checkOutReason).toMatch(/Tap quota exhausted/i);
    });
  });
});
