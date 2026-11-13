import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/active-visits/[visitId]/tap", () => {
  const visitId = "vis-api-tap-1";

  beforeEach(async () => {
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
});
