import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository, TEST_FIXTURE_DOORS } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/active-visits/[visitId]/tap", () => {
  const visitId = "vis-api-tap-1";

  beforeEach(async () => {
    await defaultVmsRepository.saveDoors(TEST_FIXTURE_DOORS);
    const activeVisit: Visit = {
      id: visitId,
      facilityId: "fac-jakarta",
      visitorGivenName: "Barry",
      visitorFamilyName: "Allen",
      visitReasonType: 2,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 0,
      tapQuota: {
        mode: "limited",
        maxTaps: 2,
      },
      hikCentral: {
        appointRecordId: "hc-appoint-barry",
        visitorId: "hc-vis-barry",
      },
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    await defaultVmsRepository.saveVisit(activeVisit);
  });

  it("records a normal door tap and returns updated remaining quota", async () => {
    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doorIndexCode: "door-turnstile-1",
        doorName: "Main Entrance SpeedGate",
        direction: "in",
      }),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.tapCount).toBe(1);
    expect(json.remainingTaps).toBe(1);
    expect(json.isQuotaExceeded).toBe(false);
    expect(json.autoCheckedOut).toBe(false);
  });

  it("triggers automatic check-out when tap quota is exhausted", async () => {
    // Set tapCount to 1 first
    await defaultVmsRepository.updateVisit(visitId, { tapCount: 1 });

    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doorIndexCode: "door-turnstile-1",
        mode: "stub",
      }),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.tapCount).toBe(2);
    expect(json.remainingTaps).toBe(0);
    expect(json.isQuotaExceeded).toBe(true);
    expect(json.autoCheckedOut).toBe(true);
    expect(json.visit.status).toBe("CHECKED_OUT");
  });

  it("returns 400 for invalid body or missing doorIndexCode", async () => {
    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.errors.doorIndexCode).toBeDefined();
  });

  it("returns 400 when attempting an exit tap on a SINGLE_DIRECTION_IN door", async () => {
    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doorIndexCode: "door-jkt-dc-01",
        direction: "out",
      }),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("validation");
    expect(json.error.message).toMatch(/SINGLE_DIRECTION_IN/i);
  });

  it("returns 403 Forbidden when visitor taps a door outside their access level without an emergency grant", async () => {
    // Restrict visit to lobby access level
    await defaultVmsRepository.updateVisit(visitId, {
      accessLevelIds: ["acc-jkt-lobby"],
    });

    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doorIndexCode: "door-jkt-dc-01",
        doorName: "DC Server Room 01",
        direction: "in",
      }),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("forbidden");
    expect(json.error.message).toMatch(/access denied/i);
  });

  describe("Fast-Track Touchless Auto Check-In HTTP API (Ticket 02)", () => {
    const approvedVisitId = "vis-api-approved-1";

    beforeEach(async () => {
      const approvedVisit: Visit = {
        id: approvedVisitId,
        facilityId: "fac-jakarta",
        visitorGivenName: "Clark",
        visitorFamilyName: "Kent",
        visitorPhone: "+6281311223344",
        visitorEmail: "clark@dailyplanet.com",
        hostId: "emp-host-01",
        hostName: "Rudi Host",
        visitReasonType: 3, // Meeting
        scheduledStartTimeUtc: "2026-11-13T09:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-13T11:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-13T16:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-13T18:00:00+07:00",
        status: "APPROVED",
        tapCount: 0,
        tapQuota: {
          mode: "limited",
          maxTaps: 4,
        },
        createdAtUtc: "2026-11-13T08:00:00.000Z",
        updatedAtUtc: "2026-11-13T08:00:00.000Z",
      };

      await defaultVmsRepository.saveVisit(approvedVisit);
    });

    it("accepts perimeter tap for APPROVED visit, performs auto check-in, and returns 200 with notification", async () => {
      const tapTime = "2026-11-13T08:52:00.000Z";
      const req = new Request(`http://localhost:3000/api/vms/active-visits/${approvedVisitId}/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-turnstile-1",
          direction: "in",
          tappedAtUtc: tapTime,
        }),
      });

      const context = { params: Promise.resolve({ visitId: approvedVisitId }) };
      const res = await POST(req, context);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.autoCheckedIn).toBe(true);
      expect(json.tapCount).toBe(1);
      expect(json.remainingTaps).toBe(3);
      expect(json.visit.status).toBe("CHECKED_IN");
      expect(json.visit.actualCheckInTimeUtc).toBe(tapTime);
      expect(json.event.direction).toBe("in");
      expect(json.event.isPerimeter).toBe(true);
      expect(json.hostNotification).toBeDefined();
      expect(json.hostNotification.visitorName).toBe("Clark Kent");
    });

    it("returns 400 validation error when APPROVED visit attempts auto check-in before arrival buffer", async () => {
      const earlyTapTime = "2026-11-13T08:35:00.000Z"; // 25m before 09:00 (cutoff is 08:45)
      const req = new Request(`http://localhost:3000/api/vms/active-visits/${approvedVisitId}/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-turnstile-1",
          direction: "in",
          tappedAtUtc: earlyTapTime,
        }),
      });

      const context = { params: Promise.resolve({ visitId: approvedVisitId }) };
      const res = await POST(req, context);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error.kind).toBe("validation");
      expect(json.error.message).toMatch(/Too early for auto check-in/i);
    });

    it("returns 400 validation error when APPROVED visit attempts tap on internal non-perimeter door", async () => {
      const req = new Request(`http://localhost:3000/api/vms/active-visits/${approvedVisitId}/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-jkt-3f-el", // internal door
          direction: "in",
          tappedAtUtc: "2026-11-13T08:50:00.000Z",
        }),
      });

      const context = { params: Promise.resolve({ visitId: approvedVisitId }) };
      const res = await POST(req, context);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error.kind).toBe("validation");
      expect(json.error.message).toBe(
        "Auto check-in only permitted at designated perimeter entry points. Please check in at reception.",
      );
    });

    it("ensures idempotency on duplicate tap webhook without resetting check-in timestamp", async () => {
      const initialTapTime = "2026-11-13T08:50:00.000Z";
      // First tap: auto check-in
      const req1 = new Request(`http://localhost:3000/api/vms/active-visits/${approvedVisitId}/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-turnstile-1",
          direction: "in",
          tappedAtUtc: initialTapTime,
        }),
      });
      const res1 = await POST(req1, { params: Promise.resolve({ visitId: approvedVisitId }) });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.autoCheckedIn).toBe(true);
      expect(json1.tapCount).toBe(1);

      // Second tap: subsequent passage
      const secondTapTime = "2026-11-13T08:55:00.000Z";
      const req2 = new Request(`http://localhost:3000/api/vms/active-visits/${approvedVisitId}/tap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCode: "door-turnstile-1",
          direction: "in",
          tappedAtUtc: secondTapTime,
        }),
      });
      const res2 = await POST(req2, { params: Promise.resolve({ visitId: approvedVisitId }) });
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.autoCheckedIn).toBe(false);
      expect(json2.tapCount).toBe(2);
      expect(json2.visit.actualCheckInTimeUtc).toBe(initialTapTime);
    });
  });
});
