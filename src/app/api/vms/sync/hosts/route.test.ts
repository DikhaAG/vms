import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/sync/hosts", () => {
  it("syncs hosts in stub mode and returns 200 with synced count", async () => {
    const request = new Request("http://localhost/api/vms/sync/hosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "stub", stubScenario: "success" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.totalSynced).toBeGreaterThan(0);
    expect(body.hosts).toBeDefined();
  });

  it("returns 502 when upstream stubScenario fails", async () => {
    const request = new Request("http://localhost/api/vms/sync/hosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "stub", stubScenario: "auth-error" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("upstream");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const request = new Request("http://localhost/api/vms/sync/hosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
