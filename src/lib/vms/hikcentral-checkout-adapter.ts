import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "./vms-contract";

export interface CheckOutAdapterOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
  userId?: string;
}

export interface HikCentralCheckOutResult {
  ok: boolean;
  appointRecordId: string;
  code: string;
  msg: string;
  data?: unknown;
}

/**
 * Runtime guard narrowing HikCentral check-out response data.
 * Validates that data is null, string, or an object (not an array or invalid primitive).
 */
export function isCheckOutResponseData(
  data: unknown,
): data is Record<string, unknown> | string | null | undefined {
  return (
    data === undefined ||
    data === null ||
    typeof data === "string" ||
    (typeof data === "object" && !Array.isArray(data))
  );
}

/**
 * Executes POST /artemis/api/visitor/v1/visitor/out to check out a visitor in HikCentral,
 * revoking all terminal permissions and access privileges across physical access points.
 */
export async function executeHikCentralCheckOut(
  appointRecordId: string,
  options: CheckOutAdapterOptions = {},
): Promise<HikCentralCheckOutResult> {
  const cleanAppointRecordId = appointRecordId?.trim();
  if (!cleanAppointRecordId) {
    throw new HikCentralError(
      "appointRecordId is required for HikCentral visitor check-out.",
      {
        kind: "api",
        status: 400,
      },
    );
  }

  const mode = options.mode ?? "live";

  if (mode === "stub") {
    const scenario = options.stubScenario ?? "success";

    if (scenario === "auth-error") {
      throw new HikCentralError(
        "HikCentral API error 0x00072002: appKey does not exist or signature verification failed.",
        {
          kind: "api",
          status: 200,
          code: "0x00072002",
          hikMsg: "appKey does not exist or signature verification failed.",
        },
      );
    }

    if (scenario === "network-error") {
      throw new HikCentralError(
        "HikCentral network failure: connect ECONNREFUSED 127.0.0.1:443",
        {
          kind: "network",
        },
      );
    }

    return {
      ok: true,
      appointRecordId: cleanAppointRecordId,
      code: "0",
      msg: "Success",
      data: null,
    };
  }

  // Live client dispatch
  let client = options.client;
  if (!client) {
    const config = loadHikCentralConfigFromEnv();
    client = createHikCentralClient(config);
  }

  const wirePayload = {
    appointRecordId: cleanAppointRecordId,
  };

  const response = await client.post<unknown>(
    "/artemis/api/visitor/v1/visitor/out",
    wirePayload,
    {
      userId: options.userId,
    },
  );

  if (response.code !== "0") {
    throw new HikCentralError(
      `HikCentral check-out error ${response.code}: ${response.msg || "Unknown error"}`,
      {
        kind: "api",
        code: response.code,
        hikMsg: response.msg,
      },
    );
  }

  if (!isCheckOutResponseData(response.data)) {
    throw new HikCentralError(
      "Invalid HikCentral check-out response: data payload is malformed.",
      {
        kind: "api",
        code: response.code,
        hikMsg: response.msg,
      },
    );
  }

  return {
    ok: true,
    appointRecordId: cleanAppointRecordId,
    code: response.code,
    msg: response.msg || "Success",
    data: response.data,
  };
}
