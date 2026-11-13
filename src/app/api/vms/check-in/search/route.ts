import { NextResponse } from "next/server";
import { defaultCheckInService } from "@/lib/vms/checkin-service";
import { isVisitStatus, type VisitStatus } from "@/lib/vms/vms-contract";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || searchParams.get("query") || "";
  const facilityId = searchParams.get("facilityId") || undefined;
  const statusParam = searchParams.get("status");

  let status: VisitStatus | VisitStatus[] | undefined;
  if (statusParam) {
    if (statusParam.includes(",")) {
      status = statusParam.split(",").filter(isVisitStatus);
    } else if (isVisitStatus(statusParam)) {
      status = statusParam;
    }
  }

  try {
    const visits = await defaultCheckInService.searchArrivingVisitors(
      q,
      facilityId,
      status,
    );
    return NextResponse.json({
      ok: true,
      data: visits,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "server",
          message:
            err instanceof Error ? err.message : "Failed to search visitors.",
        },
      },
      { status: 500 },
    );
  }
}
