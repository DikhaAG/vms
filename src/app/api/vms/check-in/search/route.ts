import { NextResponse } from "next/server";
import { defaultCheckInService } from "@/lib/vms/checkin-service";
import { isVisitStatus, type VisitStatus } from "@/lib/vms/vms-contract";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const rawStatus = searchParams.getAll("status");

  let statusFilter: VisitStatus | VisitStatus[] | undefined;
  const validStatuses = rawStatus.filter(isVisitStatus);
  if (validStatuses.length === 1) {
    statusFilter = validStatuses[0];
  } else if (validStatuses.length > 1) {
    statusFilter = validStatuses;
  }

  try {
    const visits = await defaultCheckInService.searchArrivingVisitors(
      query,
      statusFilter,
    );

    return NextResponse.json({
      ok: true,
      data: visits,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "server",
          message:
            error instanceof Error ? error.message : "Failed to search visitors.",
        },
      },
      { status: 500 },
    );
  }
}
