import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import type { PostgresVmsRepository } from "./postgres-repository";
import { defaultVmsRepository } from "./repository";
import type { HostEmployee, PreRegistrationMode, StubScenario } from "./vms-contract";

export interface SyncHikCentralHostsOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
  repository?: PostgresVmsRepository;
  userId?: string;
  pageNo?: number;
  pageSize?: number;
  personName?: string;
}

export interface SyncHikCentralHostsResult {
  ok: boolean;
  totalSynced: number;
  hosts: HostEmployee[];
  error?: {
    kind: "upstream" | "validation" | "config";
    message: string;
    code?: string;
  };
}

/**
 * Validates whether the response data from person/advance/personList matches the expected shape.
 */
export function isPersonListResponseData(data: unknown): data is {
  total?: number;
  pageNo?: number;
  pageSize?: number;
  list?: Array<Record<string, unknown>>;
} {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const rec = data as Record<string, unknown>;
  return rec.list === undefined || Array.isArray(rec.list);
}

/**
 * Synchronizes employee hosts from HikCentral using
 * POST /artemis/api/resource/v1/person/advance/personList (Ch. 5.3.8)
 * and imports them into the internal Host employee directory.
 */
export async function syncHikCentralHosts(
  options: SyncHikCentralHostsOptions = {},
): Promise<SyncHikCentralHostsResult> {
  const repository = options.repository ?? defaultVmsRepository;
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    const scenario = options.stubScenario ?? "success";
    if (scenario === "auth-error") {
      return {
        ok: false,
        totalSynced: 0,
        hosts: [],
        error: {
          kind: "upstream",
          message:
            "HikCentral API error 0x00072002: appKey does not exist or signature verification failed.",
          code: "0x00072002",
        },
      };
    }
    if (scenario === "network-error") {
      return {
        ok: false,
        totalSynced: 0,
        hosts: [],
        error: {
          kind: "upstream",
          message:
            "HikCentral network failure: connect ECONNREFUSED 127.0.0.1:443",
        },
      };
    }

    // Stub mode exercises the error scenarios only: it never invents Hosts
    // and never writes to the repository, so no fictional record reaches PostgreSQL.
    return { ok: true, totalSynced: 0, hosts: [] };
  }

  // Live client dispatch
  let client = options.client;
  if (!client) {
    try {
      const config = loadHikCentralConfigFromEnv();
      client = createHikCentralClient(config);
    } catch (err) {
      return {
        ok: false,
        totalSynced: 0,
        hosts: [],
        error: {
          kind: "config",
          message:
            err instanceof Error
              ? err.message
              : "Failed to initialize HikCentral client config.",
        },
      };
    }
  }

  const wirePayload = {
    pageNo: options.pageNo ?? 1,
    pageSize: options.pageSize ?? 500,
    ...(options.personName ? { personName: options.personName } : {}),
  };

  try {
    const response = await client.post<unknown>(
      "/artemis/api/resource/v1/person/advance/personList",
      wirePayload,
      {
        userId: options.userId ?? "admin",
      },
    );

    if (response.code !== "0") {
      return {
        ok: false,
        totalSynced: 0,
        hosts: [],
        error: {
          kind: "upstream",
          message: `HikCentral person sync error ${response.code}: ${response.msg || "Unknown error"}`,
          code: response.code,
        },
      };
    }

    if (!isPersonListResponseData(response.data)) {
      return {
        ok: false,
        totalSynced: 0,
        hosts: [],
        error: {
          kind: "upstream",
          message:
            "HikCentral person list response data is missing or malformed.",
          code: response.code,
        },
      };
    }

    const rawList = response.data.list ?? [];
    const mappedHosts: HostEmployee[] = rawList.map((item, index) => {
      const personId =
        typeof item.personId === "string" ? item.personId : undefined;
      const personCode =
        typeof item.personCode === "string" ? item.personCode : undefined;
      const id = personCode || personId || `emp-${index + 1}`;
      const name =
        typeof item.personName === "string"
          ? item.personName
          : typeof item.personFamilyName === "string"
            ? `${item.personGivenName ?? ""} ${item.personFamilyName}`.trim()
            : "Employee";

      return {
        id,
        personCode,
        name,
        email: typeof item.email === "string" ? item.email : undefined,
        phone: typeof item.phoneNo === "string" ? item.phoneNo : undefined,
        orgIndexCode:
          typeof item.orgIndexCode === "string" ? item.orgIndexCode : undefined,
      };
    });

    await repository.saveHosts(mappedHosts);

    return {
      ok: true,
      totalSynced: mappedHosts.length,
      hosts: mappedHosts,
    };
  } catch (err) {
    if (err instanceof HikCentralError) {
      return {
        ok: false,
        totalSynced: 0,
        hosts: [],
        error: {
          kind: "upstream",
          message: err.message,
          code: err.code,
        },
      };
    }

    return {
      ok: false,
      totalSynced: 0,
      hosts: [],
      error: {
        kind: "upstream",
        message:
          err instanceof Error
            ? err.message
            : "Unknown error communicating with HikCentral personList.",
      },
    };
  }
}
