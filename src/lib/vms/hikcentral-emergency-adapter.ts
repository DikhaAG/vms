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
 * Synchronizes emergency access grant privileges to HikCentral physical controllers.
 * Invokes POST /artemis/api/acs/v1/privilege/group/single/addPersons.
 */
export async function syncHikCentralEmergencyGrant(
  params: SyncEmergencyAccessParams,
  options: EmergencyAdapterOptions = {},
): Promise<{ success: boolean; synchronized: boolean }> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return { success: true, synchronized: true };
  }

  const client = resolveClient(options);
  const visitorId = params.visitorId ?? params.visitId;
  const privilegeGroupId = params.doorIndexCodes[0] || "emergency-access-group";

  const wirePayload = {
    privilegeGroupId,
    type: 2, // visitor type
    list: [
      {
        id: visitorId,
      },
    ],
  };

  await client.post(
    "/artemis/api/acs/v1/privilege/group/single/addPersons",
    wirePayload,
    {
      userId: params.userId ?? options.userId,
    },
  );

  return { success: true, synchronized: true };
}

/**
 * De-authorizes emergency access grant privileges on HikCentral physical controllers.
 * Invokes POST /artemis/api/acs/v1/privilege/group/single/deletePersons.
 */
export async function revokeHikCentralEmergencyGrant(
  params: RevokeEmergencyAccessParams,
  options: EmergencyAdapterOptions = {},
): Promise<{ success: boolean; revoked: boolean }> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return { success: true, revoked: true };
  }

  const client = resolveClient(options);
  const visitorId = params.visitorId ?? params.visitId;
  const privilegeGroupId = params.doorIndexCodes[0] || "emergency-access-group";

  const wirePayload = {
    privilegeGroupId,
    type: 2, // visitor type
    list: [
      {
        id: visitorId,
      },
    ],
  };

  await client.post(
    "/artemis/api/acs/v1/privilege/group/single/deletePersons",
    wirePayload,
    {
      userId: params.userId ?? options.userId,
    },
  );

  return { success: true, revoked: true };
}

