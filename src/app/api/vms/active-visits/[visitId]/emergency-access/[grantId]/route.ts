import { NextResponse } from "next/server";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { HikCentralError } from "@/lib/hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "@/lib/vms/vms-contract";
import { withServerErrors } from "@/lib/vms/route-errors";

async function handleDELETE(
  request: Request,
  context: { params: Promise<{ visitId: string; grantId: string }> },
) {
  const { visitId, grantId } = await context.params;

  let body: Record<string, unknown> = {};
  const rawText = await request.text().catch(() => "");
  const trimmedText = rawText.trim();
  if (trimmedText) {
    try {
      const parsed = JSON.parse(trimmedText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              kind: "validation",
              message: "Invalid JSON body in delete request",
            },
          },
          { status: 400 },
        );
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: "Invalid JSON body in delete request",
          },
        },
        { status: 400 },
      );
    }
  }

  const url = new URL(request.url);
  const operatorUserId =
    (typeof body.operatorUserId === "string" && body.operatorUserId.trim()) ||
    url.searchParams.get("operatorUserId") ||
    "system-operator";

  const operatorName =
    (typeof body.operatorName === "string" && body.operatorName.trim()) ||
    url.searchParams.get("operatorName") ||
    undefined;

  const mode =
    body.mode === "stub" || url.searchParams.get("mode") === "stub"
      ? "stub"
      : ("live" as PreRegistrationMode);

  const stubScenario =
    typeof body.stubScenario === "string"
      ? (body.stubScenario as StubScenario)
      : (url.searchParams.get("stubScenario") as StubScenario) || undefined;

  try {
    const result = await defaultActiveMonitoringService.revokeEmergencyAccess(
      visitId,
      grantId,
      operatorUserId,
      operatorName,
      {
        mode,
        stubScenario,
      },
    );

    return NextResponse.json({
      ok: true,
      grant: result.grant,
      visit: result.visit,
      message: "Emergency access revoked successfully.",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "not_found",
            message: error.message,
          },
        },
        { status: 404 },
      );
    }

    if (error instanceof HikCentralError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "upstream",
            message: error.message,
            code: error.code,
          },
        },
        { status: 502 },
      );
    }

    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "server",
          message,
        },
      },
      { status: 500 },
    );
  }
}

export const DELETE = withServerErrors(handleDELETE);
