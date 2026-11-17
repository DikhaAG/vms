import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/invite", () => {
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
});
