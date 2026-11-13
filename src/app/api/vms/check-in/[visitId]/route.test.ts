import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/check-in/[visitId]", () => {
  const visitToApprove: Visit = {
    id: "route-chk-approved-01",
    facilityId: "fac-jakarta",
    facilityName: "Jakarta Corporate HQ",
    visitorFamilyName: "Gunawan",
    visitorGivenName: "Hendra",
    certificateType: 111,
    certificateNo: "3171888888880001",
    visitReasonType: 0,
    scheduledStartTimeUtc: "2026-11-13T02:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T09:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
    status: "APPROVED",
    hikCentral: {
      appointRecordId: "hc-apt-pre-01",
      visitorId: "hc-vis-pre-01",
    },
    createdAtUtc: "2026-11-13T01:00:00Z",
    updatedAtUtc: "2026-11-13T01:00:00Z",
  };

  beforeEach(async () => {
    await defaultVmsRepository.saveVisit(visitToApprove);
  });

  it("checks in an approved visit and returns 200 with updated visit and checkInPass", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/route-chk-approved-01",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receptionistUserId: "rec-01",
          receptionistName: "Dewi Frontdesk",
          verificationMethod: "id_card",
          notes: "Checked identity card at desk",
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-chk-approved-01" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.visit.status).toBe("CHECKED_IN");
    expect(json.data.pass).toBeDefined();
    expect(json.data.pass.visitorName).toBe("Hendra Gunawan");
  });

  it("returns 400 for invalid JSON payload", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/route-chk-approved-01",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-chk-approved-01" }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
  });

  it("returns 404 for unknown visit ID", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/unknown-visit-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receptionistUserId: "rec-01",
          mode: "stub",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "unknown-visit-id" }),
    });

    expect(response.status).toBe(404);
  });
});
