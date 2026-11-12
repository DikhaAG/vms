import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/hikcentral/version", () => {
  it("returns 400 validation error on malformed JSON body", async () => {
    const request = new Request("http://localhost/api/hikcentral/version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-valid-json",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      error: {
        kind: "validation",
      },
    });
  });

  it("returns 400 validation error when payload shape or userId is invalid", async () => {
    const badShapeRequest = new Request(
      "http://localhost/api/hikcentral/version",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 123, mode: "invalid" }),
      },
    );

    const badShapeResponse = await POST(badShapeRequest);
    const badShapeBody = await badShapeResponse.json();
    expect(badShapeResponse.status).toBe(400);
    expect(badShapeBody.error?.kind).toBe("validation");

    const badUserIdRequest = new Request(
      "http://localhost/api/hikcentral/version",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "admin/bad", mode: "stub" }),
      },
    );

    const badUserIdResponse = await POST(badUserIdRequest);
    const badUserIdBody = await badUserIdResponse.json();
    expect(badUserIdResponse.status).toBe(400);
    expect(badUserIdBody.error?.kind).toBe("validation");
  });

  it("returns 200 with product version in stub success mode", async () => {
    const request = new Request("http://localhost/api/hikcentral/version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "admin",
        mode: "stub",
        stubScenario: "success",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      mode: "stub",
      data: {
        produceName: "VMSPlatform",
        softVersion: "V2.1.0.0",
      },
    });
  });

  it("maps upstream stub failures to 502 with structured error details", async () => {
    const request = new Request("http://localhost/api/hikcentral/version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "admin",
        mode: "stub",
        stubScenario: "auth-error",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      ok: false,
      mode: "stub",
      error: {
        kind: "api",
        status: 200,
        code: "0x02401006",
        message: "Token Exception.",
      },
    });
  });
});

