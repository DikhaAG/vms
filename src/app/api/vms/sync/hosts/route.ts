import { NextResponse } from "next/server";
import { syncHikCentralHosts } from "@/lib/vms/hikcentral-host-adapter";
import type { PreRegistrationMode, StubScenario } from "@/lib/vms/vms-contract";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

async function handlePOST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown> = {};

  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const parsed = await request.json();
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: "Request body must be valid JSON.",
          },
        },
        { status: 400 },
      );
    }
  }

  const mode =
    body.mode === "stub" || body.mode === "live"
      ? (body.mode as PreRegistrationMode)
      : undefined;

  const stubScenario =
    typeof body.stubScenario === "string"
      ? (body.stubScenario as StubScenario)
      : undefined;

  const personName =
    typeof body.personName === "string" ? body.personName : undefined;

  const result = await syncHikCentralHosts({
    mode,
    stubScenario,
    personName,
    pageNo: typeof body.pageNo === "number" ? body.pageNo : undefined,
    pageSize: typeof body.pageSize === "number" ? body.pageSize : undefined,
  });

  if (!result.ok) {
    const status =
      result.error?.kind === "validation"
        ? 400
        : result.error?.kind === "config"
          ? 500
          : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}

export const POST = withServerErrors(handlePOST);
