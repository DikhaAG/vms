import { describe, it, expect } from "vitest";
import { GET, POST } from "./route";

describe("Route: /api/trpc/[trpc]", () => {
  it("handles GET request to query procedure", async () => {
    const url = "http://localhost:3000/api/trpc/accessLevel.list?batch=1&input=%7B%7D";
    const req = new Request(url, {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].result).toBeDefined();
    expect(json[0].result.data).toBeDefined();
  });

  it("handles POST request to mutation procedure", async () => {
    const url = "http://localhost:3000/api/trpc/visitor.cancelPreRegistration?batch=1";
    const req = new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": {
          visitId: "non-existent-visit-id",
          reason: "Testing cancel",
        },
      }),
    });

    const res = await POST(req);
    // Should return 404 since visit does not exist
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].error).toBeDefined();
    expect(json[0].error.data.code).toBe("NOT_FOUND");
  });
});
