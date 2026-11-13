import {
  createHikCentralClient,
  loadHikCentralConfigFromEnv,
  HikCentralError,
  type HikCentralClient,
} from "../hikcentral/client";
import { stripDataUriPrefix } from "./face-normalizer";
import type {
  CredentialSyncStatus,
  PreRegistrationMode,
  StubScenario,
} from "./vms-contract";

export interface FaceQualityCheckParams {
  faceData: string; // Base64 (with or without data:image/...;base64, prefix)
  acsDevIndexCode?: string; // Target MinMoe device index code
  userId?: string;
}

export interface FaceQualityCheckResult {
  valid: boolean;
  message: string;
  code?: string;
  checked: boolean;
}

export interface RetryCredentialSyncParams {
  personIds: string; // Visitor ID or comma-separated person IDs
  immediateDownload?: number; // 0 or 1 (default: 1 per OpenAPI suggestion line 2371)
  doorIndexCodes?: string;
  userId?: string;
}

export interface RetryCredentialSyncResult {
  success: boolean;
  message: string;
  code?: string;
}

export interface GetCredentialSyncStatusParams {
  visitorId: string;
  userId?: string;
}

export interface ElementCertificateStatus {
  type: number; // 0-card, 1-fingerprint, 2-face picture, 3-iris
  id?: string;
  status: string; // 0-applied, 1-to be applied, 2-failed
  errorCode?: string;
}

export interface ElementDownloadDetail {
  elementId: string;
  elementName: string;
  elementType: number; // 6-door, 11-floor
  isOnline: boolean;
  status: string; // "0"-applied, "1"-to be applied, "2"-failed
  errorCode?: string;
  certificateStatuses: ElementCertificateStatus[];
}

export interface CredentialSyncReport {
  overallStatus: CredentialSyncStatus;
  visitorId: string;
  elements: ElementDownloadDetail[];
  summary: string;
}

export interface AdapterExecutionOptions {
  mode?: PreRegistrationMode;
  stubScenario?: StubScenario;
  client?: HikCentralClient;
}

/**
 * Verifies face picture validity against HikCentral MinMoe device
 * using POST /artemis/api/acs/v1/faceCheck.
 * Fallback-safe if no MinMoe device is configured or index code is omitted.
 */
export async function checkFaceQuality(
  params: FaceQualityCheckParams,
  options: AdapterExecutionOptions = {},
): Promise<FaceQualityCheckResult> {
  // If target MinMoe device is not specified, return safe fallback
  if (!params.acsDevIndexCode || !params.acsDevIndexCode.trim()) {
    return {
      valid: true,
      message: "Face quality check skipped: no target MinMoe device configured.",
      checked: false,
    };
  }

  const mode = options.mode ?? "live";

  if (mode === "stub") {
    const scenario = options.stubScenario ?? "success";
    if (scenario === "face-quality-failed") {
      return {
        valid: false,
        message:
          "Face resolution or angle does not meet MinMoe recognition requirements.",
        code: "0x00072040",
        checked: true,
      };
    }
    if (scenario === "auth-error") {
      throw new HikCentralError(
        "HikCentral API error 0x00072002: appKey does not exist or signature verification failed.",
        {
          kind: "api",
          status: 200,
          code: "0x00072002",
        },
      );
    }
    if (scenario === "network-error") {
      throw new HikCentralError(
        "HikCentral network failure: connect ECONNREFUSED 127.0.0.1:443",
        { kind: "network" },
      );
    }

    return {
      valid: true,
      message: "Face photo quality verified by MinMoe terminal (stub).",
      checked: true,
    };
  }

  // Live client dispatch
  let client = options.client;
  if (!client) {
    const config = loadHikCentralConfigFromEnv();
    client = createHikCentralClient(config);
  }

  const cleanFace = stripDataUriPrefix(params.faceData);
  const wirePayload = {
    faceData: cleanFace,
    acsDevIndexCode: params.acsDevIndexCode.trim(),
  };

  const response = await client.post<unknown>(
    "/artemis/api/acs/v1/faceCheck",
    wirePayload,
    {
      userId: params.userId,
    },
  );

  if (response.code === "0") {
    return {
      valid: true,
      message: "Face photo quality verified by MinMoe terminal.",
      checked: true,
    };
  }

  return {
    valid: false,
    message: response.msg || "Face quality check failed.",
    code: response.code,
    checked: true,
  };
}

/**
 * Re-applies visitor credentials to access control hardware
 * using POST /artemis/api/visitor/v1/auth/reapplication.
 * Default ImmediateDownload is 1 (excluding those which have failed) per docs line 2371.
 */
export async function retryCredentialSync(
  params: RetryCredentialSyncParams,
  options: AdapterExecutionOptions = {},
): Promise<RetryCredentialSyncResult> {
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
        },
      );
    }
    if (scenario === "network-error") {
      throw new HikCentralError(
        "HikCentral network failure: connect ECONNREFUSED 127.0.0.1:443",
        { kind: "network" },
      );
    }

    return {
      success: true,
      message: "Credential reapplication triggered successfully (stub).",
    };
  }

  let client = options.client;
  if (!client) {
    const config = loadHikCentralConfigFromEnv();
    client = createHikCentralClient(config);
  }

  const wirePayload = {
    orderId: "1",
    ImmediateDownload: params.immediateDownload ?? 1,
    personIds: params.personIds,
    ...(params.doorIndexCodes ? { doorIndexCodes: params.doorIndexCodes } : {}),
  };

  const response = await client.post<unknown>(
    "/artemis/api/visitor/v1/auth/reapplication",
    wirePayload,
    {
      userId: params.userId,
    },
  );

  return {
    success: response.code === "0",
    message: response.msg || "OK",
    code: response.code,
  };
}

/**
 * Queries the physical hardware credential download details for a visitor
 * using POST /artemis/api/visitor/v1/person/ID/elementDownloadDetail.
 */
export async function getCredentialSyncStatus(
  params: GetCredentialSyncStatusParams,
  options: AdapterExecutionOptions = {},
): Promise<CredentialSyncReport> {
  const mode = options.mode ?? "live";

  if (mode === "stub") {
    const scenario = options.stubScenario ?? "success";
    if (scenario === "sync-failed") {
      return {
        overallStatus: "Failed",
        visitorId: params.visitorId,
        elements: [
          {
            elementId: "elem-stub-failed-1",
            elementName: "Turnstile Gate East",
            elementType: 6,
            isOnline: true,
            status: "2",
            errorCode: "0x00072031",
            certificateStatuses: [
              {
                type: 2,
                status: "2",
                errorCode: "0x00072031",
              },
            ],
          },
        ],
        summary: "Hardware sync failed on 1 terminal.",
      };
    }

    if (scenario === "sync-pending") {
      return {
        overallStatus: "Syncing",
        visitorId: params.visitorId,
        elements: [
          {
            elementId: "elem-stub-pending-1",
            elementName: "Turnstile Gate West",
            elementType: 6,
            isOnline: true,
            status: "1",
            certificateStatuses: [
              {
                type: 2,
                status: "1",
              },
            ],
          },
        ],
        summary: "Credentials downloading to physical terminals.",
      };
    }

    return {
      overallStatus: "Applied",
      visitorId: params.visitorId,
      elements: [
        {
          elementId: "elem-stub-ok-1",
          elementName: "Main Entrance Turnstile",
          elementType: 6,
          isOnline: true,
          status: "0",
          certificateStatuses: [
            {
              type: 2,
              status: "0",
            },
          ],
        },
      ],
      summary: "Credentials successfully synchronized across all terminals.",
    };
  }

  let client = options.client;
  if (!client) {
    const config = loadHikCentralConfigFromEnv();
    client = createHikCentralClient(config);
  }

  const wirePayload = {
    id: params.visitorId,
  };

  const response = await client.post<Record<string, unknown>>(
    "/artemis/api/visitor/v1/person/ID/elementDownloadDetail",
    wirePayload,
    {
      userId: params.userId,
    },
  );

  const data = response.data;
  const elements: ElementDownloadDetail[] = [];

  if (data && typeof data === "object") {
    const elementDetailList = (data as Record<string, unknown>)
      .ElementDetailList as Record<string, unknown> | undefined;
    const rawDetails = elementDetailList?.ElementDetail;

    const detailsArray = Array.isArray(rawDetails)
      ? rawDetails
      : rawDetails && typeof rawDetails === "object"
        ? [rawDetails]
        : [];

    for (const raw of detailsArray) {
      if (typeof raw !== "object" || raw === null) continue;
      const item = raw as Record<string, unknown>;
      const baseInfo = item.BaseInfo as Record<string, unknown> | undefined;
      const elementStatus = item.ElementStatus as
        | Record<string, unknown>
        | undefined;
      const certList = item.CertificateStatusList as
        | Record<string, unknown>
        | undefined;
      const rawCerts = certList?.CertificateStatus;

      const certsArray = Array.isArray(rawCerts)
        ? rawCerts
        : rawCerts && typeof rawCerts === "object"
          ? [rawCerts]
          : [];

      const certificates: ElementCertificateStatus[] = [];
      for (const c of certsArray) {
        if (typeof c !== "object" || c === null) continue;
        const certObj = c as Record<string, unknown>;
        certificates.push({
          type: Number(certObj.Type ?? 0),
          id: String(certObj.ID ?? ""),
          status: String(certObj.Status ?? "0"),
          errorCode: certObj.ErrorCode ? String(certObj.ErrorCode) : undefined,
        });
      }

      elements.push({
        elementId: String(item.ID ?? item.elementID ?? ""),
        elementName: String(baseInfo?.Name ?? "Door / Terminal"),
        elementType: Number(baseInfo?.ElementType ?? 6),
        isOnline: Number(baseInfo?.Network ?? 1) === 1,
        status: String(elementStatus?.Status ?? "0"),
        errorCode: elementStatus?.ErrorCode
          ? String(elementStatus.ErrorCode)
          : undefined,
        certificateStatuses: certificates,
      });
    }
  }

  let overallStatus: CredentialSyncStatus = "Unknown";
  if (elements.length > 0) {
    const hasFailed = elements.some(
      (e) =>
        e.status === "2" ||
        e.certificateStatuses.some((c) => c.status === "2"),
    );
    const hasSyncing = elements.some(
      (e) =>
        e.status === "1" ||
        e.certificateStatuses.some((c) => c.status === "1"),
    );

    if (hasFailed) {
      overallStatus = "Failed";
    } else if (hasSyncing) {
      overallStatus = "Syncing";
    } else {
      overallStatus = "Applied";
    }
  } else if (response.code === "0") {
    overallStatus = "Applied";
  }

  return {
    overallStatus,
    visitorId: params.visitorId,
    elements,
    summary: `Status: ${overallStatus} (${elements.length} access terminal${elements.length === 1 ? "" : "s"})`,
  };
}
