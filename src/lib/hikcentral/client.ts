import https from "node:https";
import {
  signHikCentralRequest,
  type HikCentralQueryParams,
} from "./signature";

export interface HikCentralClientConfig {
  baseUrl: string;
  appKey: string;
  appSecret: string;
  defaultUserId?: string;
  timeoutMs?: number;
  tls?: {
    rejectUnauthorized?: boolean;
    ca?: string;
  };
}

export interface HikCentralRequestOptions {
  query?: HikCentralQueryParams;
  headers?: Record<string, string>;
  userId?: string;
  timeoutMs?: number;
  timestamp?: string | number;
  nonce?: string;
}

export interface HikCentralResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export type HikCentralErrorKind =
  | "config"
  | "network"
  | "http"
  | "parse"
  | "api";

export interface HikCentralErrorOptions {
  kind: HikCentralErrorKind;
  status?: number;
  code?: string;
  hikMsg?: string;
  responseBody?: string;
  cause?: unknown;
}

/**
 * Typed error raised by the HikCentral HTTP client across config, network, HTTP, parse, and API layers.
 */
export class HikCentralError extends Error {
  readonly kind: HikCentralErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly hikMsg?: string;
  readonly responseBody?: string;

  constructor(message: string, options: HikCentralErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "HikCentralError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.hikMsg = options.hikMsg;
    this.responseBody = options.responseBody;
  }
}

export interface HikCentralTransportRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  tls?: HikCentralClientConfig["tls"];
}

export interface HikCentralTransportResponse {
  status: number;
  bodyText: string;
}

export type HikCentralTransport = (
  req: HikCentralTransportRequest,
) => Promise<HikCentralTransportResponse>;

export interface HikCentralClient {
  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: HikCentralRequestOptions,
  ): Promise<HikCentralResponse<TResponse>>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const ARTEMIS_API_PREFIX = "/artemis/api/";
const HIKCENTRAL_SUCCESS_CODE = "0";

/**
 * Creates a server-side HikCentral OpenAPI HTTPS POST client backed by HmacSHA256 signing.
 */
export function createHikCentralClient(
  config: HikCentralClientConfig,
  transport: HikCentralTransport = nodeHttpsTransport,
): HikCentralClient {
  assertServerRuntime();
  const normalizedBaseUrl = normalizeBaseUrl(config.baseUrl);
  const appKey = requireNonEmpty(
    config.appKey,
    "HikCentral appKey must not be empty.",
  );
  const appSecret = config.appSecret;
  requireNonEmpty(appSecret, "HikCentral appSecret must not be empty.");

  return {
    async post<TResponse, TBody = unknown>(
      path: string,
      body?: TBody,
      options: HikCentralRequestOptions = {},
    ): Promise<HikCentralResponse<TResponse>> {
      validateArtemisPath(path);

      const serializedBody =
        body === undefined ? undefined : JSON.stringify(body);
      const userId = options.userId ?? config.defaultUserId;

      const baseHeaders = mergeHeaders(
        {
          Accept: "application/json",
          "Content-Type": "application/json;charset=UTF-8",
          ...(userId ? { userId } : {}),
        },
        options.headers,
      );

      const signed = signHikCentralRequest({
        method: "POST",
        path,
        query: options.query,
        headers: baseHeaders,
        body: serializedBody,
        appKey,
        appSecret,
        timestamp: options.timestamp,
        nonce: options.nonce,
      });

      const wireHeaders = mergeHeaders(baseHeaders, signed.headers);
      const response = await executeTransport(
        transport,
        {
          url: `${normalizedBaseUrl}${signed.uri}`,
          method: "POST",
          headers: wireHeaders,
          body: serializedBody,
          timeoutMs:
            options.timeoutMs ?? config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          tls: config.tls,
        },
        appSecret,
      );

      if (response.status < 200 || response.status >= 300) {
        throw new HikCentralError(
          `HikCentral HTTP error ${response.status} for ${path}.`,
          {
            kind: "http",
            status: response.status,
            responseBody: redactSecret(response.bodyText, appSecret).slice(
              0,
              500,
            ),
          },
        );
      }

      const envelope = parseEnvelope<TResponse>(response.bodyText, path);
      if (envelope.code !== HIKCENTRAL_SUCCESS_CODE) {
        throw new HikCentralError(
          `HikCentral API error ${envelope.code}: ${envelope.msg}`,
          {
            kind: "api",
            status: response.status,
            code: envelope.code,
            hikMsg: envelope.msg,
          },
        );
      }

      return envelope;
    },
  };
}

/**
 * Loads and validates HikCentral client configuration from server environment variables.
 */
export function loadHikCentralConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): HikCentralClientConfig {
  assertServerRuntime();
  const rawBaseUrl = requireNonEmpty(
    env.HIKCENTRAL_BASE_URL,
    "Missing required env var: HIKCENTRAL_BASE_URL",
  );
  const appKey = requireNonEmpty(
    env.HIKCENTRAL_APP_KEY,
    "Missing required env var: HIKCENTRAL_APP_KEY",
  );
  requireNonEmpty(
    env.HIKCENTRAL_APP_SECRET,
    "Missing required env var: HIKCENTRAL_APP_SECRET",
  );
  const appSecret = env.HIKCENTRAL_APP_SECRET as string;

  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  const timeoutMs = parseTimeoutMs(env.HIKCENTRAL_TIMEOUT_MS);
  const defaultUserId = env.HIKCENTRAL_USER_ID?.trim() || undefined;
  const tls = parseTlsEnv(env);

  return {
    baseUrl,
    appKey,
    appSecret,
    ...(defaultUserId !== undefined ? { defaultUserId } : {}),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
    ...(tls !== undefined ? { tls } : {}),
  };
}

function requireNonEmpty(value: string | undefined, message: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new HikCentralError(message, { kind: "config" });
  }
  return trimmed;
}

function assertServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new HikCentralError(
      "HikCentral client must only be used on the server.",
      { kind: "config" },
    );
  }
}

function mergeHeaders(
  ...sources: Array<Record<string, string> | undefined>
): Record<string, string> {
  // Deduplicate case-insensitively so wire headers never diverge from signature normalization.
  const entriesByLower = new Map<string, [string, string]>();
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source)) {
      entriesByLower.set(key.toLowerCase(), [key, value]);
    }
  }
  return Object.fromEntries(entriesByLower.values());
}

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw new HikCentralError(`Invalid HikCentral baseUrl: ${rawUrl}`, {
      kind: "config",
      cause: error,
    });
  }

  if (parsed.protocol !== "https:") {
    throw new HikCentralError(
      `HikCentral baseUrl must use https:, received ${parsed.protocol}`,
      { kind: "config" },
    );
  }

  if (parsed.pathname !== "/" || parsed.search !== "" || parsed.hash !== "") {
    throw new HikCentralError(
      `HikCentral baseUrl must be an origin without path, query, or hash: ${rawUrl}`,
      { kind: "config" },
    );
  }

  return trimmed;
}

function validateArtemisPath(path: string): void {
  if (!path.startsWith(ARTEMIS_API_PREFIX)) {
    throw new HikCentralError(
      `HikCentral request path must start with "${ARTEMIS_API_PREFIX}", received "${path}".`,
      { kind: "config" },
    );
  }
}

function parseTimeoutMs(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new HikCentralError(
      `Invalid HIKCENTRAL_TIMEOUT_MS value: "${raw}". Must be a positive number.`,
      { kind: "config" },
    );
  }
  return value;
}

function parseTlsEnv(
  env: Record<string, string | undefined>,
): HikCentralClientConfig["tls"] | undefined {
  const insecure = env.HIKCENTRAL_TLS_INSECURE?.trim().toLowerCase() === "true";
  const rawCa = env.HIKCENTRAL_CA_CERT?.trim();
  const ca = rawCa ? rawCa.replace(/\\n/g, "\n") : undefined;

  if (!insecure && ca === undefined) {
    return undefined;
  }

  return {
    ...(insecure ? { rejectUnauthorized: false } : {}),
    ...(ca !== undefined ? { ca } : {}),
  };
}

function redactSecret(text: string, appSecret: string): string {
  return appSecret ? text.split(appSecret).join("[REDACTED]") : text;
}

async function executeTransport(
  transport: HikCentralTransport,
  req: HikCentralTransportRequest,
  appSecret: string,
): Promise<HikCentralTransportResponse> {
  try {
    return await transport(req);
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Unknown network error";
    const safeMessage = redactSecret(rawMessage, appSecret);
    const hasSecretInMessage = rawMessage.includes(appSecret);
    throw new HikCentralError(`HikCentral network failure: ${safeMessage}`, {
      kind: "network",
      cause: hasSecretInMessage ? undefined : error,
    });
  }
}

function parseEnvelope<TResponse>(
  bodyText: string,
  path: string,
): HikCentralResponse<TResponse> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch (error) {
    throw new HikCentralError(
      `Invalid JSON response from HikCentral for ${path}.`,
      { kind: "parse", cause: error },
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).code !== "string" ||
    typeof (parsed as Record<string, unknown>).msg !== "string"
  ) {
    throw new HikCentralError(
      `Unexpected HikCentral response envelope for ${path}.`,
      { kind: "parse" },
    );
  }

  const record = parsed as Record<string, unknown>;
  return {
    code: record.code as string,
    msg: record.msg as string,
    data: record.data as TResponse,
  };
}

function nodeHttpsTransport(
  req: HikCentralTransportRequest,
): Promise<HikCentralTransportResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(req.url);

    const options: https.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: req.method,
      headers: req.headers,
      timeout: req.timeoutMs,
      ...(req.tls
        ? {
            rejectUnauthorized: req.tls.rejectUnauthorized ?? true,
            ...(req.tls.ca !== undefined ? { ca: req.tls.ca } : {}),
          }
        : {}),
    };

    const clientRequest = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer | string) => {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          bodyText: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });

    clientRequest.on("timeout", () => {
      clientRequest.destroy(
        new Error(`Request timed out after ${req.timeoutMs}ms`),
      );
    });

    clientRequest.on("error", reject);

    if (req.body !== undefined) {
      clientRequest.write(req.body, "utf8");
    }
    clientRequest.end();
  });
}
