import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "./vms-contract";
import { stripDataUriPrefix } from "./face-normalizer";

export interface HikCentralAppointmentParams {
  userId?: string;
  hostId?: string; // Internal Host employee ID, translated to receptionistId for HikCentral
  appointStartTime: string; // ISO 8601 string with facility offset, e.g. 2026-11-13T16:00:00+07:00
  appointEndTime: string; // ISO 8601 string with facility offset, e.g. 2026-11-13T18:00:00+07:00
  visitReasonType: number;
  visitReasonDetail?: string;
  visitorGroupName?: string;
  visitorFamilyName: string;
  visitorGivenName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  certificateType?: number;
  certificateNo?: string;
  facePhotoData?: string;
  accessLevels?: Array<{ id: string | number; name?: string }>;
  qrCodeValidNum?: number;
}

export interface HikCentralAppointmentSuccess {
  appointRecordId: string;
  visitorId: string;
  appointCode?: string;
  qrCodeImage?: string;
  watchListInfo?: unknown[];
}

export interface DispatchAppointmentOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
}

// 1x1 pixel PNG Base64 for stub QR passes
const STUB_QR_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAMElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBvA88AAAE3Z3Z2AAAAAElFTkSuQmCC";

/**
 * Dispatches POST /artemis/api/visitor/v2/appointment to HikCentral OpenAPI.
 * Translates domain fields (hostId -> receptionistId) at the anti-corruption boundary.
 */
export async function dispatchHikCentralAppointment(
  params: HikCentralAppointmentParams,
  options: DispatchAppointmentOptions = {},
): Promise<HikCentralAppointmentSuccess> {
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

    const pseudoId = Math.random().toString(36).substring(2, 9);
    const isMonitoringFlagged = scenario === "monitoring-list-flagged";
    return {
      appointRecordId: `apt-rec-${pseudoId}`,
      visitorId: `vis-${pseudoId}`,
      appointCode: Math.floor(1000 + Math.random() * 9000).toString(),
      qrCodeImage: STUB_QR_PNG_BASE64,
      watchListInfo: isMonitoringFlagged
        ? [
            {
              ID: `wl-${pseudoId}`,
              enableRegister: 0,
              rejectNum: 1,
              visitorType: 1,
              type: "Deny Entry",
              remark:
                "Security Alert: Individual certificate flagged on facility denial list",
              visitorTypeName: "High Risk Individual",
              identiFicationType: params.certificateType ?? 111,
              identiFiyCode: params.certificateNo ?? "FLAGGED-ID-001",
            },
          ]
        : undefined,
    };
  }

  // Live client dispatch
  let client = options.client;
  if (!client) {
    const config = loadHikCentralConfigFromEnv();
    client = createHikCentralClient(config);
  }

  const cleanFaceData = params.facePhotoData
    ? stripDataUriPrefix(params.facePhotoData)
    : undefined;

  const wirePayload: Record<string, unknown> = {
    receptionistId: params.hostId,
    appointStartTime: params.appointStartTime,
    appointEndTime: params.appointEndTime,
    visitReasonType: params.visitReasonType,
    visitReasonDetail: params.visitReasonDetail ?? "null",
    ...(params.accessLevels && params.accessLevels.length > 0
      ? {
          accessInfo: {
            accessLevelList: params.accessLevels.map((al) => ({
              accessLevel: {
                id: al.id,
                baseInfo: {
                  name: al.name ?? "Access Level",
                },
              },
            })),
          },
        }
      : {}),
    visitorInfoList: [
      {
        VisitorInfo: {
          visitorFamilyName: params.visitorFamilyName,
          visitorGivenName: params.visitorGivenName,
          ...(params.visitorGroupName
            ? { visitorGroupName: params.visitorGroupName }
            : {}),
          phoneNo: params.visitorPhone,
          email: params.visitorEmail,
          certificateType: params.certificateType,
          certificateNo: params.certificateNo,
          accessInfo: {
            qrCodeValidNum: params.qrCodeValidNum ?? 0,
          },
          ...(cleanFaceData
            ? {
                faces: [
                  {
                    faceData: cleanFaceData,
                  },
                ],
              }
            : {}),
        },
      },
    ],
  };

  const response = await client.post<Record<string, unknown>>(
    "/artemis/api/visitor/v2/appointment",
    wirePayload,
    {
      userId: params.userId,
    },
  );

  const data = response.data;
  if (
    typeof data !== "object" ||
    data === null ||
    typeof data.appointRecordId !== "string" ||
    typeof data.visitorId !== "string"
  ) {
    throw new HikCentralError(
      "HikCentral appointment response missing or invalid 'data' payload.",
      {
        kind: "parse",
      },
    );
  }

  const rawAppointCode =
    typeof data.appointCode === "string"
      ? data.appointCode
      : typeof data.AppointCode === "string"
        ? data.AppointCode
        : undefined;

  let rawQrImage: string | undefined;
  if (typeof data.qrCodeImage === "string") {
    rawQrImage = data.qrCodeImage.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  }

  const rawWatchList = Array.isArray(data.watchListInfo)
    ? data.watchListInfo
    : Array.isArray(data.watchlistInfo)
      ? data.watchlistInfo
      : undefined;

  return {
    appointRecordId: data.appointRecordId,
    visitorId: data.visitorId,
    appointCode: rawAppointCode,
    qrCodeImage: rawQrImage,
    watchListInfo: rawWatchList,
  };
}
