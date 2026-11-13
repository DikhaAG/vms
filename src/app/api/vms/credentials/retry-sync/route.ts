import { NextRequest, NextResponse } from "next/server";
import {
  retryCredentialSync,
  getCredentialSyncStatus,
} from "@/lib/vms/hikcentral-face-adapter";
import {
  isPreRegistrationMode,
  isStubScenario,
  type PreRegistrationMode,
  type StubScenario,
} from "@/lib/vms/vms-contract";
import { HikCentralError } from "@/lib/hikcentral/client";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const record = body as Record<string, unknown>;
  const visitorId =
    typeof record.visitorId === "string" ? record.visitorId.trim() : "";
  if (!visitorId) {
    return NextResponse.json(
      { ok: false, error: "Visitor ID is required." },
      { status: 400 },
    );
  }

  let mode: PreRegistrationMode | undefined;
  if (record.mode !== undefined && record.mode !== null) {
    if (isPreRegistrationMode(record.mode)) {
      mode = record.mode;
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid pre-registration execution mode." },
        { status: 400 },
      );
    }
  }

  let stubScenario: StubScenario | undefined;
  if (record.stubScenario !== undefined && record.stubScenario !== null) {
    if (isStubScenario(record.stubScenario)) {
      stubScenario = record.stubScenario;
    } else {
      return NextResponse.json(
        { ok: false, error: "Invalid stub scenario." },
        { status: 400 },
      );
    }
  }

  try {
    const retryResult = await retryCredentialSync(
      { personIds: visitorId },
      { mode, stubScenario },
    );

    const statusReport = await getCredentialSyncStatus(
      { visitorId },
      { mode, stubScenario },
    );

    return NextResponse.json({
      ok: true,
      syncStatus: statusReport.overallStatus,
      message: retryResult.message,
    });
  } catch (err) {
    const isHikError = err instanceof HikCentralError;
    const message = err instanceof Error ? err.message : "Retry sync failed.";
    const status = isHikError && err.kind === "config" ? 500 : 502;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status },
    );
  }
}
