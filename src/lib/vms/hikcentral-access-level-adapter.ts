import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "./vms-contract";

export interface HikCentralPrivilegeGroup {
  privilegeGroupId: string;
  privilegeGroupName: string;
  description?: string;
  isDefault?: number; // 0 (not default), 1 (default)
  timeSchedule?: {
    indexCode: string; // "1", "2", "3"
    name?: string;
  };
}

export interface PrivilegeGroupAdapterOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
  userId?: string;
}

export interface CreatePrivilegeGroupParams {
  privilegeGroupId: string;
  privilegeGroupName: string;
  description?: string;
  isDefault?: number;
  timeScheduleIndexCode: string; // "1", "2", "3"
}

export interface UpdatePrivilegeGroupParams {
  privilegeGroupId: string;
  privilegeGroupName: string;
  description?: string;
  isDefault?: number;
  timeScheduleIndexCode: string;
}

// In-memory stub list
const STUB_PRIVILEGE_GROUPS: HikCentralPrivilegeGroup[] = [
  {
    privilegeGroupId: "acc-jkt-lobby",
    privilegeGroupName: "Lobby & 1st Floor Turnstiles",
    description: "Standard ground floor turnstiles and visitor reception",
    isDefault: 1,
    timeSchedule: {
      indexCode: "2",
      name: "Workday Template",
    },
  },
  {
    privilegeGroupId: "acc-jkt-exec",
    privilegeGroupName: "Executive Floor 3",
    description: "Boardroom and executive suite access",
    isDefault: 0,
    timeSchedule: {
      indexCode: "2",
      name: "Workday Template",
    },
  },
  {
    privilegeGroupId: "acc-jkt-dc",
    privilegeGroupName: "Technical Datacenter",
    description: "Restricted datacenter server room",
    isDefault: 0,
    timeSchedule: {
      indexCode: "1",
      name: "All-Day Template",
    },
  },
];

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
}

function resolveClient(options: PrivilegeGroupAdapterOptions): HikCentralClient {
  if (options.client) return options.client;
  const config = loadHikCentralConfigFromEnv();
  return createHikCentralClient(config);
}

/**
 * Lists visitor privilege groups (Access Levels) from HikCentral.
 * POST /artemis/api/acs/v1/privilege/group with type=2.
 */
export async function listVisitorPrivilegeGroups(
  options: PrivilegeGroupAdapterOptions = {},
): Promise<HikCentralPrivilegeGroup[]> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return structuredClone(STUB_PRIVILEGE_GROUPS);
  }

  const client = resolveClient(options);
  const response = await client.post<{
    total?: number;
    pageNo?: number;
    pageSize?: number;
    list?: HikCentralPrivilegeGroup[];
  }>(
    "/artemis/api/acs/v1/privilege/group",
    {
      pageNo: 1,
      pageSize: 50,
      type: 2,
    },
    {
      userId: options.userId,
    },
  );

  const data = response.data;
  if (typeof data !== "object" || data === null || !Array.isArray(data.list)) {
    return [];
  }

  return data.list.map((item) => ({
    privilegeGroupId: String(item.privilegeGroupId),
    privilegeGroupName: String(item.privilegeGroupName),
    description: item.description,
    isDefault: item.isDefault,
    timeSchedule: item.timeSchedule,
  }));
}

/**
 * Adds a new visitor privilege group (Access Level) to HikCentral.
 * POST /artemis/api/acs/v1/privilege/group/add
 */
export async function createVisitorPrivilegeGroup(
  params: CreatePrivilegeGroupParams,
  options: PrivilegeGroupAdapterOptions = {},
): Promise<{ privilegeGroupId: string; privilegeGroupName: string }> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return {
      privilegeGroupId: params.privilegeGroupId,
      privilegeGroupName: params.privilegeGroupName,
    };
  }

  const client = resolveClient(options);
  const wirePayload = {
    type: 2,
    list: [
      {
        privilegeGroupId: params.privilegeGroupId,
        privilegeGroupName: params.privilegeGroupName,
        description: params.description ?? "",
        isDefault: params.isDefault ?? 0,
        timeSchedule: {
          indexCode: params.timeScheduleIndexCode,
        },
      },
    ],
  };

  const response = await client.post<{
    list?: Array<{ privilegeGroupId: string; privilegeGroupName: string }>;
  }>("/artemis/api/acs/v1/privilege/group/add", wirePayload, {
    userId: options.userId,
  });

  const createdList = response.data?.list;
  if (Array.isArray(createdList) && createdList.length > 0) {
    return {
      privilegeGroupId: createdList[0].privilegeGroupId,
      privilegeGroupName: createdList[0].privilegeGroupName,
    };
  }

  return {
    privilegeGroupId: params.privilegeGroupId,
    privilegeGroupName: params.privilegeGroupName,
  };
}

/**
 * Edits an existing visitor privilege group (Access Level) on HikCentral.
 * POST /artemis/api/acs/v1/privilege/group/update
 */
export async function updateVisitorPrivilegeGroup(
  params: UpdatePrivilegeGroupParams,
  options: PrivilegeGroupAdapterOptions = {},
): Promise<{ success: boolean }> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return { success: true };
  }

  const client = resolveClient(options);
  const wirePayload = {
    type: 2,
    data: {
      privilegeGroupId: params.privilegeGroupId,
      privilegeGroupName: params.privilegeGroupName,
      description: params.description ?? "",
      isDefault: params.isDefault ?? 0,
      timeSchedule: {
        indexCode: params.timeScheduleIndexCode,
      },
    },
  };

  await client.post("/artemis/api/acs/v1/privilege/group/update", wirePayload, {
    userId: options.userId,
  });

  return { success: true };
}

/**
 * Deletes a visitor privilege group (Access Level) from HikCentral.
 * POST /artemis/api/acs/v1/privilege/group/delete
 */
export async function deleteVisitorPrivilegeGroup(
  privilegeGroupId: string,
  options: PrivilegeGroupAdapterOptions = {},
): Promise<{ success: boolean }> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    checkStubErrors(options.stubScenario);
    return { success: true };
  }

  const client = resolveClient(options);
  const wirePayload = {
    type: 2,
    list: [
      {
        privilegeGroupId,
      },
    ],
  };

  await client.post("/artemis/api/acs/v1/privilege/group/delete", wirePayload, {
    userId: options.userId,
  });

  return { success: true };
}
