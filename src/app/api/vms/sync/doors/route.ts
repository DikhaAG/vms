import { NextResponse } from "next/server";
import { syncHikCentralDoors } from "@/lib/vms/hikcentral-door-adapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let body: Record<string, unknown> = {};

  const text = await request.text();
  if (text.trim().length > 0) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              kind: "validation",
              message: "Request body must be a JSON object.",
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
  const userId = typeof body.userId === "string" ? body.userId : undefined;

  const result = await syncHikCentralDoors({
    facilityId,
    pageNo,
    pageSize,
    userId,
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

