import { NextResponse } from "next/server";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { validateDoorTapInput } from "@/lib/vms/checkout-contract";
import { HikCentralError } from "@/lib/hikcentral/client";
import type { PreRegistrationMode, StubScenario } from "@/lib/vms/vms-contract";

export async function POST(
  request: Request,
  context: { params: Promise<{ visitId: string }> },
) {
  const { visitId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Request payload must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Request payload must be an object.",
        },
      },
      { status: 400 },
    );
  }

  const rawRecord = body as Record<string, unknown>;
  const rawInput = {
    ...rawRecord,
    visitId,
  };

  const validation = validateDoorTapInput(rawInput);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  const mode = rawRecord.mode === "stub" ? "stub" : ("live" as PreRegistrationMode);
  const stubScenario = typeof rawRecord.stubScenario === "string"
    ? (rawRecord.stubScenario as StubScenario)
    : undefined;

  try {
    const result = await defaultActiveMonitoringService.recordTapAndEnforceQuota(
      visitId,
      validation.input,
      {
        mode,
        stubScenario,
      },
    );

    return NextResponse.json({
      ok: true,
      tapCount: result.tapCount,
      maxTaps: result.visit.tapQuota?.mode === "limited" ? (result.visit.tapQuota.maxTaps ?? 0) : 0,
      remainingTaps: result.remainingTaps,
      isQuotaExceeded: result.isQuotaExceeded,
      autoCheckedOut: result.autoCheckedOut,
      visit: result.visit,
      event: result.event,
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

    if (error instanceof Error && error.message.includes("is in status")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "conflict",
            message: error.message,
          },
        },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes("SINGLE_DIRECTION_IN") ||
        error.message.includes("single-direction"))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.toLowerCase().includes("access denied")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "forbidden",
            message: error.message,
          },
        },
        { status: 403 },
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
