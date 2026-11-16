import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/active-visits/[visitId]/check-out", () => {
  const visitId = "vis-api-chkout-1";

  beforeEach(async () => {
    const activeVisit: Visit = {
      id: visitId,
      visitorGivenName: "Bruce",
      visitorFamilyName: "Wayne",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      hikCentral: {
        appointRecordId: "hc-appoint-bruce",
        visitorId: "hc-vis-bruce",
      },
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    await defaultVmsRepository.saveVisit(activeVisit);
  });

  it("checks out visit successfully and returns updated visit", async () => {
    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorUserId: "sec-officer-1",
        operatorName: "Officer Gordon",
        isForced: false,
        reason: "Normal visit checkout",
        mode: "stub",
      }),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.visit.status).toBe("CHECKED_OUT");
    expect(json.visit.actualCheckOutTimeUtc).toBeDefined();
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 when force checkout has no reason", async () => {
    const req = new Request(`http://localhost:3000/api/vms/active-visits/${visitId}/check-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorUserId: "sec-officer-1",
        isForced: true,
        reason: "",
      }),
    });

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.errors.reason).toBeDefined();
  });

  it("returns 404 when visit is not found", async () => {
    const req = new Request("http://localhost:3000/api/vms/active-visits/non-existent/check-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operatorUserId: "sec-officer-1",
        isForced: false,
      }),
    });

    const context = { params: Promise.resolve({ visitId: "non-existent" }) };
    const res = await POST(req, context);

    expect(res.status).toBe(404);
  });
});
