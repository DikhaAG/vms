import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/check-in/walk-in", () => {
  it("returns 400 when required fields are missing", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/walk-in",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorFamilyName: "MissingFields",
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
