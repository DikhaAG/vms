import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/check-in/walk-in", () => {
  it("creates and immediately checks in walk-in visitor returning 201", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/walk-in",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: "fac-jakarta",
          hostId: "emp-host-01",
          hostName: "Budi Santoso",
          visitorFamilyName: "Pranoto",
          visitorGivenName: "Agus",
          visitorPhone: "+628177770001",
          certificateType: 111,
          certificateNo: "3171777777770001",
          visitReasonType: 0,
          receptionistUserId: "rec-01",
          receptionistName: "Dewi Frontdesk",
          verificationMethod: "id_card",
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.visit.status).toBe("CHECKED_IN");
    expect(json.data.visit.visitorFamilyName).toBe("Pranoto");
    expect(json.data.pass.visitorName).toBe("Agus Pranoto");
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/walk-in",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorFamilyName: "MissingFacility",
          receptionistUserId: "rec-01",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.ok).toBe(false);
  });
});
