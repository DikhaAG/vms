import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "./vms-contract";
import { stripDataUriPrefix } from "./face-normalizer";

export interface HikCentralCheckInParams {
  userId?: string;
  hostId?: string; // Internal Host employee ID, translated to receptionistId for HikCentral wire
  receptionistId?: string; // Backwards-compatible alias for hostId
  appointId?: string; // Pre-registration reservation record ID if available
  visitorId?: string;
  visitStartTime: string; // ISO 8601 with facility offset
  visitEndTime: string; // ISO 8601 with facility offset
  visitPurposeType: number;
  visitPurpose?: string;
  visitorFamilyName: string;
  visitorGivenName: string;
  gender?: number; // 0-unknown, 1-male, 2-female
  email?: string;
  phoneNo?: string;
  plateNo?: string;
  companyName?: string;
  certificateType?: number;
  certificateNo?: string;
  remark?: string;
  facePhotoData?: string;
  accessLevels?: Array<{ id: string | number; name?: string }>;
  qrCodeValidNum?: number;
}

export interface HikCentralCheckInResult {
  appointRecordId: string;
  visitorId: string;
  qrCodeImage?: string;
  pinCode?: string;
}

export interface CheckInAdapterOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
}

// 1x1 pixel PNG Base64 for stub QR passes
const STUB_QR_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAMElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBvA88AAAE3Z3Z2AAAAAElFTkSuQmCC";

/**
 * Executes POST /artemis/api/visitor/v1/registerment to check in a visitor.
 * Links pre-registered appointment via appointId if available, or creates
 * a direct registration for front-desk walk-in visitors.
 */
export async function executeHikCentralCheckIn(
  params: HikCentralCheckInParams,
  options: CheckInAdapterOptions = {},
): Promise<HikCentralCheckInResult> {
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
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    return {
      appointRecordId: `hc-reg-${pseudoId}`,
      visitorId: params.visitorId ?? `vis-hc-${pseudoId}`,
      qrCodeImage: STUB_QR_PNG_BASE64,
      pinCode: pin,
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
    receptionistId: params.hostId ?? params.receptionistId ?? "",
    ...(params.appointId ? { appointId: params.appointId } : {}),
    ...(params.visitorId ? { visitorId: params.visitorId } : {}),
    visitStartTime: params.visitStartTime,
    visitEndTime: params.visitEndTime,
    visitPurposeType: params.visitPurposeType,
    visitPurpose: params.visitPurpose ?? "visit",
    ...(params.accessLevels && params.accessLevels.length > 0
      ? {
          accessInfo: {
            accessLevelList: params.accessLevels.map((al) => ({
              id: al.id,
              baseInfo: {
                name: al.name ?? "Access Level",
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
          gender: params.gender ?? 0,
          ...(params.email ? { email: params.email } : {}),
          ...(params.phoneNo ? { phoneNo: params.phoneNo } : {}),
          ...(params.plateNo ? { plateNo: params.plateNo } : {}),
          ...(params.companyName ? { companyName: params.companyName } : {}),
          ...(params.certificateType
            ? { certificateType: params.certificateType }
            : {}),
          ...(params.certificateNo
            ? { certificateNo: params.certificateNo }
            : {}),
          ...(params.remark ? { remark: params.remark } : {}),
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
    "/artemis/api/visitor/v1/registerment",
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
      "HikCentral check-in response missing or invalid 'data' payload.",
      {
        kind: "parse",
      },
    );
  }

  let rawQrImage: string | undefined;
  if (typeof data.qrCodeImage === "string") {
    rawQrImage = data.qrCodeImage.replace(
      /^data:image\/[a-zA-Z]+;base64,/,
      "",
    );
  }

  const rawPin =
    typeof data.PINCode === "string"
      ? data.PINCode
      : typeof data.pinCode === "string"
        ? data.pinCode
        : undefined;

  return {
    appointRecordId: data.appointRecordId,
    visitorId: data.visitorId,
    qrCodeImage: rawQrImage,
    pinCode: rawPin,
  };
}
