import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import { defaultVmsRepository, type IVmsRepository } from "./repository";
import type { FacilityDoor, DoorAccessType } from "./checkout-contract";

export interface SyncHikCentralDoorsOptions {
  client?: HikCentralClient;
  repository?: IVmsRepository;
  facilityId?: string;
  userId?: string;
  pageNo?: number;
  pageSize?: number;
}

export interface SyncHikCentralDoorsResult {
  ok: boolean;
  totalSynced: number;
  doors: FacilityDoor[];
  error?: {
    kind: "upstream" | "validation" | "config";
    message: string;
    code?: string;
  };
}

export interface RawHikCentralDoorItem {
  doorIndexCode?: string;
  acsDevIndexCode?: string;
  regionIndexCode?: string;
  doorNo?: string;
  channelNo?: string | number;
  doorName?: string;
  doorState?: number;
  doorOutState?: number;
  [key: string]: unknown;
}

/**
 * Validates whether the response data from acsDoorList matches the expected shape.
 */
export function isDoorListResponseData(data: unknown): data is {
  total?: number;
  pageNo?: number;
  pageSize?: number;
  list?: Array<RawHikCentralDoorItem>;
} {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const rec = data as Record<string, unknown>;
  return rec.list === undefined || Array.isArray(rec.list);
}

/**
 * Evaluates whether a door constitutes an external perimeter barrier (speedgates, turnstiles, main gate).
 */
export function isPerimeterDoor(doorName?: string): boolean {
  if (!doorName) return false;
  const lower = doorName.toLowerCase();
  return /turnstile|speedgate|speed\s*gate|barrier|gate|portal|entrance|gerbang|lobby|pintu\s*masuk/i.test(
    lower,
  );
}

/**
 * HikCentral door reader state: -1 indicates no exit reader / push-to-exit only.
 */
export const HIK_DOOR_OUT_STATE_NONE = -1;

/**
 * Deduces single-direction vs dual-direction reader capabilities from HikCentral doorOutState.
 */
export function deduceDoorAccessType(doorOutState?: number): DoorAccessType {
  if (doorOutState === HIK_DOOR_OUT_STATE_NONE) {
    return "SINGLE_DIRECTION_IN";
  }
  return "DUAL_DIRECTION";
}

/**
 * Synchronizes physical doors and access points from HikCentral OpenAPI using
 * POST /artemis/api/resource/v1/acsDoor/acsDoorList (Ch. 5.4.3)
 * and stores them in the flat door repository.
 */
export async function syncHikCentralDoors(
  options: SyncHikCentralDoorsOptions = {},
): Promise<SyncHikCentralDoorsResult> {
  const repository = options.repository ?? defaultVmsRepository;

  let client = options.client;
  if (!client) {
    try {
      const config = loadHikCentralConfigFromEnv();
      client = createHikCentralClient(config);
    } catch (err) {
      return {
        ok: false,
        totalSynced: 0,
        doors: [],
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

  const requestedPageSize = options.pageSize ?? 500;
  const isSinglePage = options.pageNo !== undefined;
  let currentPage = options.pageNo ?? 1;

  const allRawList: RawHikCentralDoorItem[] = [];

  try {
    let hasMorePages = true;
    while (hasMorePages) {
      const response = await client.post<unknown>(
        "/artemis/api/resource/v1/acsDoor/acsDoorList",
        {
          pageNo: currentPage,
          pageSize: requestedPageSize,
        },
        {
          userId: options.userId ?? "admin",
        },
      );

      if (response.code !== "0") {
        return {
          ok: false,
          totalSynced: 0,
          doors: [],
          error: {
            kind: "upstream",
            message: `HikCentral acsDoor sync error ${response.code}: ${response.msg || "Unknown error"}`,
            code: response.code,
          },
        };
      }

      if (!isDoorListResponseData(response.data)) {
        return {
          ok: false,
          totalSynced: 0,
          doors: [],
          error: {
            kind: "upstream",
            message: "HikCentral door list response data is missing or malformed.",
            code: response.code,
          },
        };
      }

      const pageList = response.data.list ?? [];
      allRawList.push(...pageList);

      if (isSinglePage) {
        hasMorePages = false;
      } else {
        const total = response.data.total ?? allRawList.length;
        if (allRawList.length >= total || pageList.length < requestedPageSize) {
          hasMorePages = false;
        } else {
          currentPage += 1;
        }
      }
    }

    const mappedDoors: FacilityDoor[] = allRawList
      .filter(
        (item): item is RawHikCentralDoorItem & { doorIndexCode: string } =>
          typeof item.doorIndexCode === "string" &&
          item.doorIndexCode.trim().length > 0,
      )
      .map((item) => {
        const doorIndexCode = item.doorIndexCode.trim();
        const doorName =
          typeof item.doorName === "string" && item.doorName.trim().length > 0
            ? item.doorName.trim()
            : `Pintu ${item.doorNo || doorIndexCode}`;

        const accessType = deduceDoorAccessType(item.doorOutState);
        const isPerimeter = isPerimeterDoor(doorName);

        const channelNo =
          item.channelNo !== undefined
            ? (typeof item.channelNo === "number" ? item.channelNo : String(item.channelNo).trim())
            : item.doorNo !== undefined
              ? (typeof item.doorNo === "number" ? item.doorNo : String(item.doorNo).trim())
              : undefined;

        const isOffline = item.doorState === 4 || item.doorOutState === 4;
        const isOnline =
          typeof item.doorState === "number" || typeof item.doorOutState === "number"
            ? !isOffline
            : undefined;

        return {
          id: `door-${doorIndexCode}`,
          ...(options.facilityId ? { facilityId: options.facilityId } : {}),
          regionIndexCode: item.regionIndexCode ? String(item.regionIndexCode).trim() : undefined,
          doorIndexCode,
          doorName,
          channelNo,
          doorState: typeof item.doorState === "number" ? item.doorState : undefined,
          doorOutState: typeof item.doorOutState === "number" ? item.doorOutState : undefined,
          acsDevIndexCode: typeof item.acsDevIndexCode === "string" ? item.acsDevIndexCode.trim() : undefined,
          isOnline,
          accessType,
          isPerimeter,
        };
      });

    await repository.saveDoors(mappedDoors);

    return {
      ok: true,
      totalSynced: mappedDoors.length,
      doors: mappedDoors,
    };
  } catch (err) {
    if (err instanceof HikCentralError) {
      return {
        ok: false,
        totalSynced: 0,
        doors: [],
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
      doors: [],
      error: {
        kind: "upstream",
        message:
          err instanceof Error
            ? err.message
            : "Unknown error communicating with HikCentral acsDoorList.",
      },
    };
  }
}
