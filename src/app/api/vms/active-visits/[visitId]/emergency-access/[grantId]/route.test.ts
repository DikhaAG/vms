import { describe, it, expect, beforeEach } from "vitest";
import { DELETE } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import type { Visit } from "@/lib/vms/vms-contract";

describe("DELETE /api/vms/active-visits/[visitId]/emergency-access/[grantId]", () => {
  const visitId = "vis-api-del-1";
  let grantId: string;

  beforeEach(async () => {
    const activeVisit: Visit = {
      id: visitId,
      facilityId: "fac-jakarta",
      visitorGivenName: "Tony",
      visitorFamilyName: "Stark",
      visitReasonType: 3,
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

    const grantRes = await defaultActiveMonitoringService.grantEmergencyAccess(
      visitId,
      {
        doorIndexCodes: ["door-jkt-dc-01"],
        grantedByUserId: "sec-officer-01",
        reason: "Pre-seed emergency grant for revocation test",
        durationHours: 2,
      },
      { mode: "stub" },
    );
    grantId = grantRes.grant.id;
  });

  it("revokes an active emergency grant and returns 200 with updated grant status", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access/${grantId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorUserId: "sec-supervisor-01",
          operatorName: "Captain Rhodes",
          mode: "stub",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId, grantId }) };
    const res = await DELETE(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.grant).toBeDefined();
    expect(json.grant.status).toBe("REVOKED");
    expect(json.grant.revokedByUserId).toBe("sec-supervisor-01");
    expect(json.grant.revokedByName).toBe("Captain Rhodes");
  });

  it("revokes using query parameters when request body is empty", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access/${grantId}?operatorUserId=sec-query-01&mode=stub`,
      {
        method: "DELETE",
      },
    );

    const context = { params: Promise.resolve({ visitId, grantId }) };
    const res = await DELETE(req, context);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.grant.status).toBe("REVOKED");
    expect(json.grant.revokedByUserId).toBe("sec-query-01");
  });

  it("returns 404 when grant does not exist", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access/non-existent-grant`,
      {
        method: "DELETE",
      },
    );

    const context = {
      params: Promise.resolve({ visitId, grantId: "non-existent-grant" }),
    };
    const res = await DELETE(req, context);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("not_found");
  });

  it("returns 502 when HikCentral encounters upstream error", async () => {
    const req = new Request(
      `http://localhost:3000/api/vms/active-visits/${visitId}/emergency-access/${grantId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorUserId: "sec-supervisor-01",
          mode: "stub",
          stubScenario: "network-error",
        }),
      },
    );

    const context = { params: Promise.resolve({ visitId, grantId }) };
    const res = await DELETE(req, context);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error.kind).toBe("upstream");
  });
});
