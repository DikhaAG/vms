import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  type HikCentralClient,
} from "../hikcentral/client";
import type {
  MonitoringListFlag,
  MonitoringListMatch,
} from "./approval-contract";

export interface SyncApprovalParams {
  userId?: string;
  operateType: 0 | 1; // 0: approve, 1: reject
  approvalOpinion?: string;
  approvalFlowCode?: number | string;
  watchlistId?: number;
}

export interface SyncApprovalOptions {
  mode?: "live" | "stub";
  client?: HikCentralClient;
}

export interface SyncApprovalResult {
  success: boolean;
  synced: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Parses monitoring list (blacklist) matches from a HikCentral appointment response payload.
 * Translates upstream field names (e.g. identiFiyCode -> certificateNo) at the adapter boundary.
 */
export function parseMonitoringListFlag(
  payload: unknown,
): MonitoringListFlag | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const rawWatchList = record.watchListInfo ?? record.watchlistInfo;

  if (!Array.isArray(rawWatchList) || rawWatchList.length === 0) {
    return undefined;
  }

  const matches: MonitoringListMatch[] = rawWatchList.map((item) => {
    if (typeof item !== "object" || item === null) {
      return {};
    }
    const m = item as Record<string, unknown>;
    return {
      id: typeof m.ID === "string" ? m.ID : typeof m.id === "string" ? m.id : undefined,
      enableRegister:
        typeof m.enableRegister === "number" ? m.enableRegister : undefined,
      rejectNum: typeof m.rejectNum === "number" ? m.rejectNum : undefined,
      visitorType:
        typeof m.visitorType === "number" ? m.visitorType : undefined,
      type: typeof m.type === "string" ? m.type : undefined,
      remark: typeof m.remark === "string" ? m.remark : undefined,
      visitorTypeName:
        typeof m.visitorTypeName === "string" ? m.visitorTypeName : undefined,
      identificationType:
        typeof m.identiFicationType === "number"
          ? m.identiFicationType
          : typeof m.identificationType === "number"
            ? m.identificationType
            : undefined,
      certificateNo:
        typeof m.identiFiyCode === "string"
          ? m.identiFiyCode
          : typeof m.certificateNo === "string"
            ? m.certificateNo
            : undefined,
    };
  });

  const firstRemark = matches.find((m) => m.remark)?.remark;
  const reason =
    firstRemark || "Visitor identity matched HikCentral monitoring list.";

  return {
    isFlagged: true,
    flaggedAtUtc: new Date().toISOString(),
    reason,
    matches,
  };
}

/**
 * Dispatches POST /artemis/api/visitor/v1/visitorapprovalflow/status to sync
 * an approval or rejection decision to HikCentral.
 * Follows Ch. 5.7.16 specifications.
 */
export async function syncApprovalToHikCentral(
  params: SyncApprovalParams,
  options: SyncApprovalOptions = {},
): Promise<SyncApprovalResult> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    return {
      success: true,
      synced: true,
      data: {
        errorCode: 0,
        visitorID: 100,
        approvalFlowCode: String(params.approvalFlowCode ?? "stub-flow"),
      },
    };
  }

  try {
    let client = options.client;
    if (!client) {
      const config = loadHikCentralConfigFromEnv();
      client = createHikCentralClient(config);
    }

    const flowCode =
      params.approvalFlowCode !== undefined && params.approvalFlowCode !== null
        ? params.approvalFlowCode
        : "null";

    const wirePayload = {
      visitor: {
        operateType: params.operateType,
        approvalOpinion: params.approvalOpinion ?? "null",
        approvalFlowInfo: [
          {
            approvalFlowCode: flowCode,
            watchlistInfo: {
              id: params.watchlistId ?? 0,
            },
          },
        ],
      },
    };

    const headers: Record<string, string> = {};
    if (params.userId) {
      headers.userId = params.userId;
    }

    const response = await client.post<{
      code: string;
      msg: string;
      data?: unknown;
    }>("/artemis/api/visitor/v1/visitorapprovalflow/status", wirePayload, headers);

    return {
      success: response.code === "0",
      synced: response.code === "0",
      data: response.data,
      error: response.code === "0" ? undefined : response.msg,
    };
  } catch (err) {
    return {
      success: false,
      synced: false,
      error: err instanceof Error ? err.message : "HikCentral approval sync error",
    };
  }
}
