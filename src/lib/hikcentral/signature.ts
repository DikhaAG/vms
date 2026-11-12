import { createHash, createHmac } from "node:crypto";

export type HikCentralQueryParams = Record<
  string,
  string | number | boolean | undefined
>;

export interface SignHikCentralRequestInput {
  method: string;
  path: string;
  query?: HikCentralQueryParams;
  headers?: Record<string, string>;
  body?: string;
  appKey: string;
  appSecret: string;
  timestamp?: string | number;
  nonce?: string;
}

export interface SignedHikCentralHeaders {
  headers: Record<string, string>;
  signature: string;
  signatureHeaders: string;
  stringToSign: string;
  uri: string;
}

const EXCLUDED_SIGNATURE_HEADERS = new Set([
  "x-ca-signature",
  "x-ca-signature-headers",
  "accept",
  "content-md5",
  "content-type",
  "date",
  "content-length",
  "server",
  "connection",
  "host",
  "transfer-encoding",
  "x-application-context",
  "content-encoding",
]);

const FIXED_HEADER_ORDER = [
  "accept",
  "content-md5",
  "content-type",
  "date",
] as const;

/**
 * Signs an HTTP request according to HikCentral OpenAPI V3.1.1 Chapter 3.2.
 */
export function signHikCentralRequest(
  input: SignHikCentralRequestInput,
): SignedHikCentralHeaders {
  const appKey = input.appKey.trim();
  if (!appKey) {
    throw new Error("HikCentral appKey must not be empty.");
  }
  if (!input.appSecret.trim()) {
    throw new Error("HikCentral appSecret must not be empty.");
  }

  const method = input.method.toUpperCase();
  const normalizedHeaders = normalizeHeaders(input.headers ?? {});
  const computedContentMd5 = computeContentMd5IfAbsent(
    input.body,
    normalizedHeaders,
  );
  if (computedContentMd5 !== undefined) {
    normalizedHeaders["content-md5"] = computedContentMd5;
  }

  const rawTimestamp =
    input.timestamp !== undefined ? String(input.timestamp).trim() : "";
  const timestamp = rawTimestamp || String(Date.now());
  const nonce = input.nonce?.trim() || undefined;
  const signedHeaderMap = buildSignedHeaderMap(
    normalizedHeaders,
    appKey,
    timestamp,
    nonce,
  );

  const sortedSignedNames = Object.keys(signedHeaderMap).sort(
    compareLexicographically,
  );
  const signatureHeaders = sortedSignedNames.join(",");
  const uri = buildUri(input.path, input.query);
  const stringToSign = buildStringToSign(
    method,
    normalizedHeaders,
    signedHeaderMap,
    sortedSignedNames,
    uri,
  );

  const signature = createHmac("sha256", input.appSecret)
    .update(stringToSign, "utf8")
    .digest("base64");

  const authHeaders: Record<string, string> = {
    ...(computedContentMd5 !== undefined
      ? { "Content-MD5": computedContentMd5 }
      : {}),
    "X-Ca-Key": appKey,
    ...(nonce !== undefined ? { "X-Ca-Nonce": nonce } : {}),
    "X-Ca-Timestamp": timestamp,
    "X-Ca-Signature-Headers": signatureHeaders,
    "X-Ca-Signature": signature,
  };

  return {
    headers: authHeaders,
    signature,
    signatureHeaders,
    stringToSign,
    uri,
  };
}

function normalizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key.toLowerCase()] = value.trim();
  }
  return result;
}

function computeContentMd5IfAbsent(
  body: string | undefined,
  normalizedHeaders: Record<string, string>,
): string | undefined {
  if (normalizedHeaders["content-md5"] !== undefined) {
    return undefined;
  }
  if (body === undefined || body.length === 0) {
    return undefined;
  }
  return createHash("md5").update(body, "utf8").digest("base64");
}

function buildSignedHeaderMap(
  normalizedHeaders: Record<string, string>,
  appKey: string,
  timestamp: string,
  nonce: string | undefined,
): Record<string, string> {
  const signed: Record<string, string> = {};
  for (const [name, value] of Object.entries(normalizedHeaders)) {
    if (!EXCLUDED_SIGNATURE_HEADERS.has(name)) {
      signed[name] = value;
    }
  }
  signed["x-ca-key"] = appKey;
  signed["x-ca-timestamp"] = timestamp;
  if (nonce !== undefined) {
    signed["x-ca-nonce"] = nonce;
  }
  return signed;
}

function buildStringToSign(
  method: string,
  normalizedHeaders: Record<string, string>,
  signedHeaderMap: Record<string, string>,
  sortedSignedNames: string[],
  uri: string,
): string {
  const lines: string[] = [method];
  // Chapter 3.2: omit the newline entirely when Accept/Content-MD5/Content-Type/Date is absent.
  for (const headerName of FIXED_HEADER_ORDER) {
    const value = normalizedHeaders[headerName];
    if (value !== undefined) {
      lines.push(value);
    }
  }
  for (const name of sortedSignedNames) {
    lines.push(`${name}:${signedHeaderMap[name]}`);
  }
  lines.push(uri);
  return lines.join("\n");
}

function buildUri(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const hashIndex = path.indexOf("#");
  const pathWithoutFragment = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const queryIndex = pathWithoutFragment.indexOf("?");
  const basePath =
    queryIndex === -1
      ? pathWithoutFragment
      : pathWithoutFragment.slice(0, queryIndex);
  const rawQuery =
    queryIndex === -1 ? "" : pathWithoutFragment.slice(queryIndex + 1);

  const params = new Map<string, string | null>();
  if (rawQuery.length > 0) {
    for (const segment of rawQuery.split("&")) {
      if (segment.length === 0) continue;
      const eqIndex = segment.indexOf("=");
      if (eqIndex === -1) {
        params.set(segment, null);
      } else {
        params.set(segment.slice(0, eqIndex), segment.slice(eqIndex + 1));
      }
    }
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  if (params.size === 0) {
    return basePath;
  }

  const sortedQuery = Array.from(params.entries())
    .sort(([a], [b]) => compareLexicographically(a, b))
    .map(([key, value]) => (value === null ? key : `${key}=${value}`))
    .join("&");

  return `${basePath}?${sortedQuery}`;
}

function compareLexicographically(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
