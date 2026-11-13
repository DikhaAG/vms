import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/invite", () => {
  const validPayload = {
    facilityId: "fac-jakarta",
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitReasonType: 3,
    visitReasonDetail: "Strategic Partnership Discussion",
    scheduledStartTime: "2026-11-20T09:00",
    scheduledEndTime: "2026-11-20T11:00",
  };

  it("returns 201 and invitation details on valid request", async () => {
    const request = new Request("http://localhost:3000/api/vms/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.invitation).toBeDefined();
    expect(body.invitation.token).toBeDefined();
    expect(body.inviteUrl).toMatch(/^\/invite\//);
    expect(body.visit).toBeDefined();
    expect(body.visit.status).toBe("DRAFT");
    expect(body.visit.facilityId).toBe("fac-jakarta");
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const request = new Request("http://localhost:3000/api/vms/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.kind).toBe("validation");
  });

  it("returns 400 when required fields are missing", async () => {
    const request = new Request("http://localhost:3000/api/vms/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId: "fac-jakarta",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors.scheduledStartTime).toBeDefined();
  });

  it("returns 404 when facility does not exist", async () => {
    const request = new Request("http://localhost:3000/api/vms/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        facilityId: "non-existent-facility",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.kind).toBe("not_found");
  });
});
