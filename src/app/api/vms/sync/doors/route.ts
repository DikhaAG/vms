import { NextResponse } from "next/server";
import { syncHikCentralDoors } from "@/lib/vms/hikcentral-door-adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
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

  const facilityId =
    typeof body.facilityId === "string" ? body.facilityId : undefined;
  const pageNo = typeof body.pageNo === "number" ? body.pageNo : undefined;
  const pageSize = typeof body.pageSize === "number" ? body.pageSize : undefined;

  const result = await syncHikCentralDoors({
    facilityId,
    pageNo,
    pageSize,
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
