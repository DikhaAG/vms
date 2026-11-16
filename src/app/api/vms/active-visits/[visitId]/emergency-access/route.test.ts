import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/active-visits/[visitId]/emergency-access", () => {
  const visitId = "vis-api-emg-1";

  beforeEach(async () => {
    const activeVisit: Visit = {
      id: visitId,
      visitorGivenName: "Peter",
      visitorFamilyName: "Parker",
      visitReasonType: 2,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T12:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T19:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 0,
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    await defaultVmsRepository.saveVisit(activeVisit);
  });

  it("grants emergency access with valid payload and returns 201", async () => {
    const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "sec-officer-01",
          grantedByName: "Officer Davis",
          reason: "Urgent HVAC repair in datacenter",
          expiresAtUtc: futureDate,
          mode: "stub",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.grant).toBeDefined();
    expect(json.grant.status).toBe("ACTIVE");
    expect(json.grant.doorIndexCodes).toEqual(["door-jkt-dc-01"]);
    expect(json.grant.reason).toBe("Urgent HVAC repair in datacenter");
  });

  it("returns 400 when reason is shorter than 10 characters", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "sec-officer-01",
          reason: "Short",
          durationHours: 2,
          mode: "stub",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.errors.reason).toBeDefined();
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      },
    );

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("validation");
  });

  it("returns 404 when visit does not exist", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/non-existent/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "sec-officer-01",
          reason: "Emergency data center cooling repair",
          durationHours: 2,
          mode: "stub",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId: "non-existent" }) };
    const res = await POST(req, context);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("not_found");
  });

  it("returns 409 when visit is in CHECKED_OUT status", async () => {
    await defaultVmsRepository.updateVisit(visitId, { status: "CHECKED_OUT" });

    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "sec-officer-01",
          reason: "Late emergency access request",
          durationHours: 2,
          mode: "stub",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("conflict");
  });

  it("returns 502 when HikCentral encounters upstream auth error", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doorIndexCodes: ["door-jkt-dc-01"],
          grantedByUserId: "sec-officer-01",
          reason: "Hardware sync failure test reason",
          durationHours: 2,
          mode: "stub",
          stubScenario: "auth-error",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId }) };
    const res = await POST(req, context);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("upstream");
  });
});

