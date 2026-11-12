import { describe, expect, it } from "vitest";
import { signHikCentralRequest } from "./signature";

describe("signHikCentralRequest", () => {
  it("builds the Chapter 3.2 canonical stringToSign and HmacSHA256 signature", () => {
    const result = signHikCentralRequest({
      method: "post",
      path: "/artemis/api/example",
      query: {
        qb: "B",
        qa: "a",
      },
      headers: {
        Accept: "*/*",
        "Content-Type": "text/plain;charset=UTF-8",
        "Content-Length": "0",
        Connection: "keep-alive",
        "header-B": " b ",
        "header-A": "A",
      },
      appKey: "29666671",
      appSecret: "test-app-secret",
      timestamp: 1479968678000,
    });

    expect(result.stringToSign).toBe(
      [
        "POST",
        "*/*",
        "text/plain;charset=UTF-8",
        "header-a:A",
        "header-b:b",
        "x-ca-key:29666671",
        "x-ca-timestamp:1479968678000",
        "/artemis/api/example?qa=a&qb=B",
      ].join("\n"),
    );
    expect(result.signatureHeaders).toBe(
      "header-a,header-b,x-ca-key,x-ca-timestamp",
    );
    expect(result.signature).toBe(
      "EohDBKqmOWzKl5oAo6Djb79xfUkgcq5nnB+ED9chTZw=",
    );
    expect(result.headers).toMatchObject({
      "X-Ca-Key": "29666671",
      "X-Ca-Timestamp": "1479968678000",
      "X-Ca-Signature-Headers": "header-a,header-b,x-ca-key,x-ca-timestamp",
      "X-Ca-Signature": "EohDBKqmOWzKl5oAo6Djb79xfUkgcq5nnB+ED9chTZw=",
    });
  });

  it("computes Content-MD5 for JSON bodies and includes Date and X-Ca-Nonce", () => {
    const result = signHikCentralRequest({
      method: "POST",
      path: "/artemis/api/common/v1/version",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
        Date: "Thu, 24 Nov 2016 03:12:25 GMT",
      },
      body: '{"pageNo":1}',
      appKey: "29666671",
      appSecret: "test-app-secret",
      timestamp: 1479968678000,
      nonce: "nonce-123",
    });

    expect(result.stringToSign).toBe(
      [
        "POST",
        "application/json",
        "CIDY2Kv3qhPmfhmvaCqZDA==",
        "application/json;charset=UTF-8",
        "Thu, 24 Nov 2016 03:12:25 GMT",
        "x-ca-key:29666671",
        "x-ca-nonce:nonce-123",
        "x-ca-timestamp:1479968678000",
        "/artemis/api/common/v1/version",
      ].join("\n"),
    );
    expect(result.signatureHeaders).toBe("x-ca-key,x-ca-nonce,x-ca-timestamp");
    expect(result.signature).toBe(
      "aQJ++eVuq8dz3HL0gvAFJK5CfyA8GMiTZkNKhAIj3NE=",
    );
    expect(result.headers).toEqual({
      "Content-MD5": "CIDY2Kv3qhPmfhmvaCqZDA==",
      "X-Ca-Key": "29666671",
      "X-Ca-Nonce": "nonce-123",
      "X-Ca-Timestamp": "1479968678000",
      "X-Ca-Signature-Headers": "x-ca-key,x-ca-nonce,x-ca-timestamp",
      "X-Ca-Signature": "aQJ++eVuq8dz3HL0gvAFJK5CfyA8GMiTZkNKhAIj3NE=",
    });
  });

  it("excludes all 13 non-signature headers, omits absent optional lines, and sorts path+query params", () => {
    const result = signHikCentralRequest({
      method: "POST",
      path: "/artemis/api/example?z=3&a=1",
      query: {
        m: 2,
        skipped: undefined,
      },
      headers: {
        "X-Ca-Signature": "stale-sig",
        "X-Ca-Signature-Headers": "stale-headers",
        "Content-Length": "123",
        Server: "nginx",
        Connection: "close",
        Host: "example.com",
        "Transfer-Encoding": "chunked",
        "X-Application-Context": "ctx",
        "Content-Encoding": "gzip",
      },
      appKey: "29666671",
      appSecret: "test-app-secret",
      timestamp: 1479968678000,
    });

    expect(result.stringToSign).toBe(
      [
        "POST",
        "x-ca-key:29666671",
        "x-ca-timestamp:1479968678000",
        "/artemis/api/example?a=1&m=2&z=3",
      ].join("\n"),
    );
    expect(result.signatureHeaders).toBe("x-ca-key,x-ca-timestamp");
    expect(result.signature).toBe(
      "vi1eNtKzUJmEHPKa/XHp9TpZi0dHx2UTOytp7bI4Urw=",
    );
  });

  it("sorts custom signature headers lexicographically by code point and preserves bare query flags", () => {
    const result = signHikCentralRequest({
      method: "POST",
      path: "/artemis/api/example?qc&qa=value1",
      query: {
        qb: "value2",
      },
      headers: {
        "X-Z": "last",
        "X-A": "first",
        userId: "admin",
      },
      appKey: "29666671",
      appSecret: "test-app-secret",
      timestamp: 1479968678000,
      nonce: "n1",
    });

    expect(result.signatureHeaders).toBe(
      "userid,x-a,x-ca-key,x-ca-nonce,x-ca-timestamp,x-z",
    );
    expect(result.stringToSign.endsWith("/artemis/api/example?qa=value1&qb=value2&qc")).toBe(
      true,
    );
  });

  it("trims appKey, strips URL fragments, and falls back when timestamp is blank", () => {
    const result = signHikCentralRequest({
      method: "POST",
      path: "/artemis/api/example?a=1#section",
      appKey: " 29666671 ",
      appSecret: "test-app-secret",
      timestamp: "   ",
    });

    expect(result.headers["X-Ca-Key"]).toBe("29666671");
    expect(result.headers["X-Ca-Timestamp"]).toMatch(/^\d+$/);
    expect(result.stringToSign.endsWith("/artemis/api/example?a=1")).toBe(true);
  });

  it("throws when appKey or appSecret is empty", () => {
    expect(() =>
      signHikCentralRequest({
        method: "POST",
        path: "/artemis/api/common/v1/version",
        appKey: "",
        appSecret: "test-app-secret",
      }),
    ).toThrow(/appKey/i);

    expect(() =>
      signHikCentralRequest({
        method: "POST",
        path: "/artemis/api/common/v1/version",
        appKey: "29666671",
        appSecret: "   ",
      }),
    ).toThrow(/appSecret/i);
  });
});
