import { NextResponse } from "next/server";
import {
  checkHikCentralVersion,
  type StubScenario,
  type VersionCheckInput,
  type VersionCheckMode,
  type VersionCheckResult,
} from "@/lib/hikcentral/version";
import {
  isStubScenario,
  isVersionCheckMode,
  STUB_SCENARIOS,
  VERSION_CHECK_MODES,
} from "@/lib/hikcentral/version-contract";

export const dynamic = "force-dynamic";

function validationErrorResponse(message: string): NextResponse {
  const result: VersionCheckResult = {
    ok: false,
    mode: "live",
    latencyMs: 0,
    error: {
      kind: "validation",
      message,
    },
  };
  return NextResponse.json(result, { status: 400 });
}

function parseVersionCheckPayload(
  rawBody: unknown,
): { input: VersionCheckInput } | { error: string } {
  if (typeof rawBody !== "object" || rawBody === null || Array.isArray(rawBody)) {
    return { error: "Request body must be a JSON object." };
  }

  const record = rawBody as Record<string, unknown>;
  if (typeof record.userId !== "string") {
    return { error: "Field 'userId' is required and must be a string." };
  }

  let mode: VersionCheckMode | undefined;
  if (record.mode !== undefined) {
    if (!isVersionCheckMode(record.mode)) {
      return {
        error: `Field 'mode' must be one of: ${VERSION_CHECK_MODES.join(", ")}.`,
      };
    }
    mode = record.mode;
  }

  let stubScenario: StubScenario | undefined;
  if (record.stubScenario !== undefined) {
    if (!isStubScenario(record.stubScenario)) {
      return {
        error: `Field 'stubScenario' must be one of: ${STUB_SCENARIOS.join(", ")}.`,
      };
    }
    stubScenario = record.stubScenario;
  }

  return {
    input: {
      userId: record.userId,
      mode,
      stubScenario,
    },
  };
}

function statusForVersionResult(result: VersionCheckResult): number {
  if (result.ok) {
    return 200;
  }
  switch (result.error?.kind) {
    case "validation":
      return 400;
    case "config":
      return 500;
    default:
      return 502;
  }
}

export async function GET(): Promise<NextResponse> {
  const result = await checkHikCentralVersion({ userId: "admin" });
  return NextResponse.json(result, { status: statusForVersionResult(result) });
}

/**
 * Executes a server-side HikCentral version connectivity check and maps errors to HTTP status codes.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return validationErrorResponse("Request body must be valid JSON.");
  }

  const parsed = parseVersionCheckPayload(rawBody);
  if ("error" in parsed) {
    return validationErrorResponse(parsed.error);
  }

  const result = await checkHikCentralVersion(parsed.input);
  return NextResponse.json(result, { status: statusForVersionResult(result) });
}

