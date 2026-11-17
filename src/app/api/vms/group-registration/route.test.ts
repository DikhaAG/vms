import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/group-registration", () => {
  const validPayload = {
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitorGroupName: "Google DeepMind Engineering Delegation",
    scheduledStartTime: "2026-11-13T14:00:00+07:00",
    scheduledEndTime: "2026-11-13T17:00:00+07:00",
    visitReasonType: 3,
    accessLevelIds: ["acc-jkt-lobby"],
    visitors: [
      {
        visitorFamilyName: "Hassabis",
        visitorGivenName: "Demis",
        visitorPhone: "+442071234567",
        visitorEmail: "demis@deepmind.com",
        certificateType: 414,
        certificateNo: "GBR12345678",
      },
      {
        visitorFamilyName: "Dean",
        visitorGivenName: "Jeff",
        visitorPhone: "+16501234567",
        visitorEmail: "jeff@google.com",
        certificateType: 414,
        certificateNo: "USA98765432",
      },
    ],
    mode: "stub",
    stubScenario: "success",
  };

  it("returns 400 on invalid JSON body", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/group-registration",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad-json",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
  });

  it("returns 400 when validation fails (e.g. missing visitors array)", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/group-registration",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validPayload,
          visitors: [],
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
  });
});
