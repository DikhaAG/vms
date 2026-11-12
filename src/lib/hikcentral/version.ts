import {
  createHikCentralClient,
  HikCentralError,
  loadHikCentralConfigFromEnv,
  type HikCentralClient,
} from "./client";
import {
  isHikCentralVersionData,
  validateUserId,
  type HikCentralVersionData,
  type StubScenario,
  type VersionCheckError,
  type VersionCheckInput,
  type VersionCheckMode,
  type VersionCheckResult,
} from "./version-contract";

export {
  validateUserId,
  type HikCentralVersionData,
  type StubScenario,
  type VersionCheckError,
  type VersionCheckInput,
  type VersionCheckMode,
  type VersionCheckResult,
};

export interface VersionCheckDeps {
  clientFactory?: () => HikCentralClient;
  now?: () => number;
}

const VERSION_ENDPOINT_PATH = "/artemis/api/common/v1/version";

/**
 * Checks HikCentral connectivity and authentication via POST /artemis/api/common/v1/version.
 */
export async function checkHikCentralVersion(
  input: VersionCheckInput,
  deps: VersionCheckDeps = {},
): Promise<VersionCheckResult> {
  const now = deps.now ?? (() => performance.now());
  const mode: VersionCheckMode = input.mode ?? "live";
  const startedAt = now();

  const userIdError = validateUserId(input.userId);
  if (userIdError !== undefined) {
    return {
      ok: false,
      mode,
      latencyMs: elapsedMs(now, startedAt),
      error: {
        kind: "validation",
        message: userIdError,
      },
    };
  }

  if (mode === "stub") {
    return runStubScenario(
      input.stubScenario ?? "success",
      elapsedMs(now, startedAt),
    );
  }

  try {
    const client =
      deps.clientFactory?.() ??
      createHikCentralClient(loadHikCentralConfigFromEnv());

    const response = await client.post<unknown>(
      VERSION_ENDPOINT_PATH,
      undefined,
      { userId: input.userId.trim() },
    );

    if (!isHikCentralVersionData(response.data)) {
      return {
        ok: false,
        mode,
        latencyMs: elapsedMs(now, startedAt),
        error: {
          kind: "parse",
          code: response.code,
          message:
            "HikCentral version response is missing required produceName or softVersion fields.",
        },
      };
    }

    return {
      ok: true,
      mode,
      latencyMs: elapsedMs(now, startedAt),
      data: response.data,
    };
  } catch (error) {
    return {
      ok: false,
      mode,
      latencyMs: elapsedMs(now, startedAt),
      error: mapVersionCheckError(error),
    };
  }
}

function runStubScenario(
  scenario: StubScenario,
  latencyMs: number,
): VersionCheckResult {
  if (scenario === "auth-error") {
    return {
      ok: false,
      mode: "stub",
      latencyMs,
      error: {
        kind: "api",
        status: 200,
        code: "0x02401006",
        message: "Token Exception.",
      },
    };
  }
  if (scenario === "network-error") {
    return {
      ok: false,
      mode: "stub",
      latencyMs,
      error: {
        kind: "network",
        message: "HikCentral network failure: connect ECONNREFUSED (stub).",
      },
    };
  }
  return {
    ok: true,
    mode: "stub",
    latencyMs,
    data: {
      produceName: "VMSPlatform",
      softVersion: "V2.1.0.0",
    },
  };
}

function mapVersionCheckError(error: unknown): VersionCheckError {
  if (error instanceof HikCentralError) {
    return {
      kind: error.kind,
      ...(error.status !== undefined ? { status: error.status } : {}),
      ...(error.code !== undefined ? { code: error.code } : {}),
      message: error.kind === "api" && error.hikMsg ? error.hikMsg : error.message,
    };
  }

  return {
    kind: "network",
    message: error instanceof Error ? error.message : "Unknown error",
  };
}

function elapsedMs(now: () => number, startedAt: number): number {
  return Math.max(0, Math.round(now() - startedAt));
}
