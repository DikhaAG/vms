import { describe, expect, it } from "vitest";
import {
  createHikCentralClient,
  HikCentralError,
  loadHikCentralConfigFromEnv,
  type HikCentralTransportRequest,
} from "./client";

const BASE_CONFIG = {
  baseUrl: "https://hik.example.com:443/",
  appKey: "29666671",
  appSecret: "super-secret-value",
  defaultUserId: "admin",
};

describe("createHikCentralClient", () => {
  it("signs and executes a POST request and returns the parsed success envelope", async () => {
    let capturedRequest: HikCentralTransportRequest | undefined;

    const client = createHikCentralClient(BASE_CONFIG, async (req) => {
      capturedRequest = req;
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
    });

    const response = await client.post<{
      produceName: string;
      softVersion: string;
    }>("/artemis/api/common/v1/version", undefined, {
      timestamp: 1479968678000,
    });

    expect(response).toEqual({
      code: "0",
      msg: "Success",
      data: {
        produceName: "VMSPlatform",
        softVersion: "V2.1.0.0",
      },
    });
    expect(capturedRequest).toBeDefined();
    expect(capturedRequest?.method).toBe("POST");
    expect(capturedRequest?.url).toBe(
      "https://hik.example.com:443/artemis/api/common/v1/version",
    );
    expect(capturedRequest?.headers).toMatchObject({
      Accept: "application/json",
      "Content-Type": "application/json;charset=UTF-8",
      userId: "admin",
      "X-Ca-Key": "29666671",
      "X-Ca-Timestamp": "1479968678000",
      "X-Ca-Signature-Headers": "userid,x-ca-key,x-ca-timestamp",
    });
    expect(capturedRequest?.headers["X-Ca-Signature"]).toMatch(
      /^[A-Za-z0-9+/]+={0,2}$/,
    );
  });

  it("serializes JSON body with Content-MD5 and appends sorted query params to request URL", async () => {
    let capturedRequest: HikCentralTransportRequest | undefined;

    const client = createHikCentralClient(BASE_CONFIG, async (req) => {
      capturedRequest = req;
      return {
        status: 200,
        bodyText: JSON.stringify({ code: "0", msg: "Success", data: { total: 0 } }),
      };
    });

    await client.post(
      "/artemis/api/visitor/v1/appointment/appointmentlist",
      { pageNo: 1 },
      {
        query: { z: "last", a: "first" },
        userId: "reception-1",
        timestamp: 1479968678000,
        nonce: "uuid-1",
      },
    );

    expect(capturedRequest?.url).toBe(
      "https://hik.example.com:443/artemis/api/visitor/v1/appointment/appointmentlist?a=first&z=last",
    );
    expect(capturedRequest?.body).toBe('{"pageNo":1}');
    expect(capturedRequest?.headers).toMatchObject({
      "Content-MD5": "CIDY2Kv3qhPmfhmvaCqZDA==",
      userId: "reception-1",
      "X-Ca-Nonce": "uuid-1",
    });
  });

  it("deduplicates header overrides case-insensitively so wire headers match signed values", async () => {
    let capturedRequest: HikCentralTransportRequest | undefined;

    const client = createHikCentralClient(BASE_CONFIG, async (req) => {
      capturedRequest = req;
      return {
        status: 200,
        bodyText: JSON.stringify({ code: "0", msg: "Success", data: {} }),
      };
    });

    await client.post("/artemis/api/common/v1/version", undefined, {
      headers: {
        accept: "*/*",
        userid: "override-user",
      },
      timestamp: 1479968678000,
    });

    expect(capturedRequest?.headers).not.toHaveProperty("Accept");
    expect(capturedRequest?.headers).not.toHaveProperty("userId");
    expect(capturedRequest?.headers).toMatchObject({
      accept: "*/*",
      userid: "override-user",
      "X-Ca-Signature-Headers": "userid,x-ca-key,x-ca-timestamp",
    });
  });

  it("maps business error code !== '0' to HikCentralError with kind 'api'", async () => {
    const client = createHikCentralClient(BASE_CONFIG, async () => ({
      status: 200,
      bodyText: JSON.stringify({
        code: "0x02401006",
        msg: "Token Exception.",
        data: "",
      }),
    }));

    await expect(
      client.post("/artemis/api/common/v1/version"),
    ).rejects.toMatchObject({
      name: "HikCentralError",
      kind: "api",
      code: "0x02401006",
      hikMsg: "Token Exception.",
    });
  });

  it("maps non-2xx HTTP responses to HikCentralError with kind 'http' including responseBody", async () => {
    const client = createHikCentralClient(BASE_CONFIG, async () => ({
      status: 403,
      bodyText: "Signature invalid",
    }));

    await expect(
      client.post("/artemis/api/common/v1/version"),
    ).rejects.toMatchObject({
      name: "HikCentralError",
      kind: "http",
      status: 403,
      responseBody: "Signature invalid",
    });
  });

  it("maps malformed JSON or missing envelope code to HikCentralError with kind 'parse'", async () => {
    const badJsonClient = createHikCentralClient(BASE_CONFIG, async () => ({
      status: 200,
      bodyText: "<html>not json</html>",
    }));

    await expect(
      badJsonClient.post("/artemis/api/common/v1/version"),
    ).rejects.toMatchObject({
      name: "HikCentralError",
      kind: "parse",
    });

    const badEnvelopeClient = createHikCentralClient(BASE_CONFIG, async () => ({
      status: 200,
      bodyText: JSON.stringify({ ok: true }),
    }));

    await expect(
      badEnvelopeClient.post("/artemis/api/common/v1/version"),
    ).rejects.toMatchObject({
      name: "HikCentralError",
      kind: "parse",
    });
  });

  it("maps transport failures to HikCentralError with kind 'network' without leaking appSecret", async () => {
    const client = createHikCentralClient(BASE_CONFIG, async () => {
      throw new Error(`connect ECONNREFUSED using ${BASE_CONFIG.appSecret}`);
    });

    let caught: unknown;
    try {
      await client.post("/artemis/api/common/v1/version");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HikCentralError);
    expect(caught).toMatchObject({ kind: "network", cause: undefined });
    expect((caught as Error).message).not.toContain(BASE_CONFIG.appSecret);
  });

  it("rejects non-/artemis/api/ paths, non-https baseUrl, and invalid baseUrl with kind 'config'", async () => {
    expect(() =>
      createHikCentralClient({ ...BASE_CONFIG, baseUrl: "not-a-url" }),
    ).toThrow(HikCentralError);

    expect(() =>
      createHikCentralClient({
        ...BASE_CONFIG,
        baseUrl: "http://hik.example.com",
      }),
    ).toThrow(HikCentralError);

    const client = createHikCentralClient(BASE_CONFIG, async () => ({
      status: 200,
      bodyText: JSON.stringify({ code: "0", msg: "Success", data: {} }),
    }));

    await expect(client.post("/wrong/path")).rejects.toMatchObject({
      name: "HikCentralError",
      kind: "config",
    });
  });
});

describe("loadHikCentralConfigFromEnv", () => {
  it("loads required and optional HikCentral config including TLS settings", () => {
    const config = loadHikCentralConfigFromEnv({
      HIKCENTRAL_BASE_URL: "https://10.26.31.41:443/",
      HIKCENTRAL_APP_KEY: "29666671",
      HIKCENTRAL_APP_SECRET: "secret-123",
      HIKCENTRAL_USER_ID: "admin",
      HIKCENTRAL_TIMEOUT_MS: "15000",
      HIKCENTRAL_TLS_INSECURE: "true",
      HIKCENTRAL_CA_CERT: "LINE1\\nLINE2",
    });

    expect(config).toEqual({
      baseUrl: "https://10.26.31.41:443",
      appKey: "29666671",
      appSecret: "secret-123",
      defaultUserId: "admin",
      timeoutMs: 15000,
      tls: {
        rejectUnauthorized: false,
        ca: "LINE1\nLINE2",
      },
    });
  });

  it("throws HikCentralError with kind 'config' when required env vars are missing or invalid", () => {
    expect(() => loadHikCentralConfigFromEnv({})).toThrow(HikCentralError);

    expect(() =>
      loadHikCentralConfigFromEnv({
        HIKCENTRAL_BASE_URL: "ftp://invalid.local",
        HIKCENTRAL_APP_KEY: "29666671",
        HIKCENTRAL_APP_SECRET: "secret",
      }),
    ).toThrow(HikCentralError);

    expect(() =>
      loadHikCentralConfigFromEnv({
        HIKCENTRAL_BASE_URL: "https://hik.local",
        HIKCENTRAL_APP_KEY: "29666671",
        HIKCENTRAL_APP_SECRET: "secret",
        HIKCENTRAL_TIMEOUT_MS: "-5",
      }),
    ).toThrow(HikCentralError);
  });
});
