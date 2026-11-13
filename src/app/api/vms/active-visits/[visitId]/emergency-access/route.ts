import { NextResponse } from "next/server";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { validateGrantEmergencyAccessInput } from "@/lib/vms/checkout-contract";
import { HikCentralError } from "@/lib/hikcentral/client";

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

  const rawInput = {
    ...(body as Record<string, unknown>),
    visitId,
  };

  const validation = validateGrantEmergencyAccessInput(rawInput);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        errors: validation.errors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await defaultActiveMonitoringService.grantEmergencyAccess(
      visitId,
      validation.input,
      {
        mode: validation.input.mode,
        stubScenario: validation.input.stubScenario,
      },
    );

    return NextResponse.json(
      {
        ok: true,
        grant: result.grant,
        visit: result.visit,
        message: "Emergency access granted successfully.",
      },
      { status: 201 },
    );
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

