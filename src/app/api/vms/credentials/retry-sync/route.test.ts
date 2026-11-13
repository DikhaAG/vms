import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/vms/credentials/retry-sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/vms/credentials/retry-sync", () => {
  it("triggers credential reapplication successfully in stub mode", async () => {
    const request = createPostRequest({
      visitorId: "vis-12345",
      mode: "stub",
      stubScenario: "success",
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = (await response.json()) as {
      ok: boolean;
      syncStatus: string;
      message: string;
    };
    expect(json.ok).toBe(true);
    expect(json.syncStatus).toBe("Applied");
    expect(json.message).toMatch(/triggered/i);
  });

  it("returns 400 when visitorId is missing", async () => {
    const request = createPostRequest({
      mode: "stub",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = (await response.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/visitor id/i);
  });

  it("returns 400 on malformed JSON payload", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/vms/credentials/retry-sync",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-body{",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = (await response.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 502 when upstream HikCentral error occurs", async () => {
    const request = createPostRequest({
      visitorId: "vis-12345",
      mode: "stub",
      stubScenario: "network-error",
    });

    const response = await POST(request);
    expect(response.status).toBe(502);

    const json = (await response.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toMatch(/network|connect/i);
  });
});
