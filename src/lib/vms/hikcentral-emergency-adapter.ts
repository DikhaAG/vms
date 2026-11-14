import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "./vms-contract";

export interface SyncEmergencyAccessParams {
  visitId: string;
  visitorId?: string;
  doorIndexCodes: string[];
  expiresAtUtc: string;
  userId?: string;
}

export interface RevokeEmergencyAccessParams {
  visitId: string;
  visitorId?: string;
  doorIndexCodes: string[];
  userId?: string;
}

export interface EmergencyAdapterOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
  userId?: string;
}

type EmergencyAction = "addPersons" | "deletePersons";

interface BaseEmergencyParams {
  visitId: string;
  visitorId?: string;
  doorIndexCodes: string[];
  userId?: string;
}

/**
 * Runtime guard narrowing HikCentral emergency access response data.
 * Validates that data is a non-null object and not an array.
 */
export function isHikCentralEmergencyResponseData(
  data: unknown,
): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}

function checkStubErrors(scenario?: StubScenario) {
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
  if (scenario === "sync-failed") {
    throw new HikCentralError(
      "HikCentral API error 0x00072010: Privilege group person synchronization failed.",
      {
        kind: "api",
        status: 200,
        code: "0x00072010",
        hikMsg: "Privilege group person synchronization failed.",
      },
    );
  }
}

function resolveClient(options: EmergencyAdapterOptions): HikCentralClient {
  if (options.client) return options.client;
  const config = loadHikCentralConfigFromEnv();
  return createHikCentralClient(config);
}

/**
 * Shared helper dispatching emergency privilege changes to HikCentral physical controllers.
 * Eliminates duplicate payload assembly for addPersons and deletePersons actions
 * and iterates across all configured door privilege groups.
 */
async function dispatchEmergencyPrivilege(
  action: EmergencyAction,
  params: BaseEmergencyParams,
  options: EmergencyAdapterOptions = {},
): Promise<void> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return;
  }

  const client = resolveClient(options);
  const visitorId = params.visitorId ?? params.visitId;
  const targetDoors =
    params.doorIndexCodes.length > 0
      ? params.doorIndexCodes
      : ["emergency-access-group"];

  for (const privilegeGroupId of targetDoors) {
    const wirePayload = {
      privilegeGroupId,
      type: 2, // visitor type
      list: [
        {
          id: visitorId,
        },
      ],
    };

    const response = await client.post<unknown>(
      `/artemis/api/acs/v1/privilege/group/single/${action}`,
      wirePayload,
      {
        userId: params.userId ?? options.userId,
      },
    );

    if (response.code !== "0") {
      throw new HikCentralError(
        `HikCentral emergency privilege error ${response.code}: ${response.msg || "Unknown error"}`,
        {
          kind: "api",
          code: response.code,
          hikMsg: response.msg,
        },
      );
    }

    if (!isHikCentralEmergencyResponseData(response.data)) {
      throw new HikCentralError(
        "Invalid HikCentral emergency response: data payload is malformed.",
        {
          kind: "api",
          code: response.code,
          hikMsg: response.msg,
        },
      );
    }
  }
}

/**
 * Synchronizes emergency access grant privileges to HikCentral physical controllers.
 * Invokes POST /artemis/api/acs/v1/privilege/group/single/addPersons for all target doors.
 */
export async function syncHikCentralEmergencyGrant(
  params: SyncEmergencyAccessParams,
  options: EmergencyAdapterOptions = {},
): Promise<{ success: boolean; synchronized: boolean }> {
  await dispatchEmergencyPrivilege("addPersons", params, options);
  return { success: true, synchronized: true };
}

/**
 * De-authorizes emergency access grant privileges on HikCentral physical controllers.
 * Invokes POST /artemis/api/acs/v1/privilege/group/single/deletePersons for all target doors.
 */
export async function revokeHikCentralEmergencyGrant(
  params: RevokeEmergencyAccessParams,
  options: EmergencyAdapterOptions = {},
): Promise<{ success: boolean; revoked: boolean }> {
  await dispatchEmergencyPrivilege("deletePersons", params, options);
  return { success: true, revoked: true };
}
