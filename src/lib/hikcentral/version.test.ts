import { describe, expect, it } from "vitest";
import { createHikCentralClient, HikCentralError } from "./client";
import { checkHikCentralVersion } from "./version";

describe("checkHikCentralVersion", () => {
  it("calls POST /artemis/api/common/v1/version in live mode and returns product version with latency", async () => {
    let capturedPath: string | undefined;
    let capturedUserId: string | undefined;
    let tick = 1000;

    const client = createHikCentralClient(
      {
        baseUrl: "https://hik.example.com:443",
        appKey: "29666671",
        appSecret: "test-app-secret",
      },
      async (req) => {
        capturedPath = new URL(req.url).pathname;
        capturedUserId = req.headers.userId;
        tick += 42;
        return {
          status: 200,
          bodyText: JSON.stringify({
            code: "0",
            msg: "Success",
            data: {
              produceName: "VMSPlatform",
              softVersion: "V2.1.0.0",
            },
          }),
        };
      },
    );

    const result = await checkHikCentralVersion(
      { userId: "admin", mode: "live" },
      {
        clientFactory: () => client,
        now: () => tick,
      },
    );

    expect(capturedPath).toBe("/artemis/api/common/v1/version");
    expect(capturedUserId).toBe("admin");
    expect(result).toEqual({
      ok: true,
      mode: "live",
      latencyMs: 42,
      data: {
        produceName: "VMSPlatform",
        softVersion: "V2.1.0.0",
      },
    });
  });

  it("validates userId per Chapter 5.1.1 (1-32 chars, no forbidden special characters)", async () => {
    let clientFactoryCalled = false;
    const clientFactory = () => {
      clientFactoryCalled = true;
      throw new Error("should not call clientFactory for invalid userId");
    };

    const invalidUserIds = [
      "",
      "   ",
      "a".repeat(33),
      "admin'1",
      "admin/1",
      "admin\\1",
      "admin:1",
      "admin*1",
      "admin?1",
      'admin"1',
      "admin<1",
      "admin>1",
      "admin|1",
    ];

    for (const userId of invalidUserIds) {
      const result = await checkHikCentralVersion(
        { userId, mode: "live" },
        { clientFactory },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("validation");
      expect(result.error?.message).toBeTruthy();
    }

    expect(clientFactoryCalled).toBe(false);

    const validBoundaryClient = createHikCentralClient(
      {
        baseUrl: "https://hik.example.com:443",
        appKey: "29666671",
        appSecret: "test-app-secret",
      },
      async () => ({
        status: 200,
        bodyText: JSON.stringify({
          code: "0",
          msg: "Success",
          data: { produceName: "VMSPlatform", softVersion: "V2.1.0.0" },
        }),
      }),
    );

    const boundaryResult = await checkHikCentralVersion(
      { userId: "a".repeat(32), mode: "live" },
      { clientFactory: () => validBoundaryClient },
    );
    expect(boundaryResult.ok).toBe(true);
  });

  it("supports stub mode scenarios without calling the live client", async () => {
    let clientFactoryCalled = false;
    const clientFactory = () => {
      clientFactoryCalled = true;
      throw new Error("should not call clientFactory in stub mode");
    };

    const successResult = await checkHikCentralVersion(
      { userId: "admin", mode: "stub", stubScenario: "success" },
      { clientFactory, now: () => 500 },
    );
    expect(successResult).toEqual({
      ok: true,
      mode: "stub",
      latencyMs: 0,
      data: {
        produceName: "VMSPlatform",
        softVersion: "V2.1.0.0",
      },
    });

    const authErrorResult = await checkHikCentralVersion(
      { userId: "admin", mode: "stub", stubScenario: "auth-error" },
      { clientFactory, now: () => 500 },
    );
    expect(authErrorResult).toEqual({
      ok: false,
      mode: "stub",
      latencyMs: 0,
      error: {
        kind: "api",
        status: 200,
        code: "0x02401006",
        message: "Token Exception.",
      },
    });

    const networkErrorResult = await checkHikCentralVersion(
      { userId: "admin", mode: "stub", stubScenario: "network-error" },
      { clientFactory, now: () => 500 },
    );
    expect(networkErrorResult.ok).toBe(false);
    expect(networkErrorResult.mode).toBe("stub");
    expect(networkErrorResult.error).toMatchObject({
      kind: "network",
    });
    expect(clientFactoryCalled).toBe(false);
  });

  it("maps HikCentralError instances in live mode to structured error results", async () => {
    const apiClient = createHikCentralClient(
      {
        baseUrl: "https://hik.example.com:443",
        appKey: "29666671",
        appSecret: "test-app-secret",
      },
      async () => ({
        status: 200,
        bodyText: JSON.stringify({
          code: "0x02401006",
          msg: "Token Exception.",
          data: "",
        }),
      }),
    );

    const apiResult = await checkHikCentralVersion(
      { userId: "admin", mode: "live" },
      { clientFactory: () => apiClient, now: () => 100 },
    );
    expect(apiResult).toEqual({
      ok: false,
      mode: "live",
      latencyMs: 0,
      error: {
        kind: "api",
        status: 200,
        code: "0x02401006",
        message: "Token Exception.",
      },
    });

    const configResult = await checkHikCentralVersion(
      { userId: "admin", mode: "live" },
      {
        clientFactory: () => {
          throw new HikCentralError("Missing required env var: HIKCENTRAL_BASE_URL", {
            kind: "config",
          });
        },
        now: () => 100,
      },
    );
    expect(configResult).toEqual({
      ok: false,
      mode: "live",
      latencyMs: 0,
      error: {
        kind: "config",
        message: "Missing required env var: HIKCENTRAL_BASE_URL",
      },
    });

    const httpClient = createHikCentralClient(
      {
        baseUrl: "https://hik.example.com:443",
        appKey: "29666671",
        appSecret: "test-app-secret",
      },
      async () => ({
        status: 403,
        bodyText: "Forbidden",
      }),
    );

    const httpResult = await checkHikCentralVersion(
      { userId: "admin", mode: "live" },
      { clientFactory: () => httpClient, now: () => 100 },
    );
    expect(httpResult).toEqual({
      ok: false,
      mode: "live",
      latencyMs: 0,
      error: {
        kind: "http",
        status: 403,
        message: "HikCentral HTTP error 403 for /artemis/api/common/v1/version.",
      },
    });
  });

  it("rejects live code '0' responses when produceName or softVersion is missing", async () => {
    const incompleteClient = createHikCentralClient(
      {
        baseUrl: "https://hik.example.com:443",
        appKey: "29666671",
        appSecret: "test-app-secret",
      },
      async () => ({
        status: 200,
        bodyText: JSON.stringify({
          code: "0",
          msg: "Operation succeeded.",
          data: {},
        }),
      }),
    );

    const result = await checkHikCentralVersion(
      { userId: "admin", mode: "live" },
      { clientFactory: () => incompleteClient, now: () => 100 },
    );

    expect(result).toEqual({
      ok: false,
      mode: "live",
      latencyMs: 0,
      error: {
        kind: "parse",
        code: "0",
        message:
          "HikCentral version response is missing required produceName or softVersion fields.",
      },
    });
  });
});
