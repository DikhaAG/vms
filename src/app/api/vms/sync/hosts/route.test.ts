import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/vms/sync/hosts", () => {
  it("syncs no Hosts and writes nothing in stub mode", async () => {
    const request = new Request("http://localhost/api/vms/sync/hosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "stub", stubScenario: "success" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual({ ok: true, totalSynced: 0, hosts: [] });
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
