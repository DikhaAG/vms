import { NextResponse } from "next/server";
import { listPendingApprovals } from "@/lib/vms/approval-service";
import { withServerErrors } from "@/lib/vms/route-errors";

async function handleGET(request: Request) {
  try {
    const url = new URL(request.url);
    const facilityId = url.searchParams.get("facilityId") || undefined;

    const data = await listPendingApprovals(facilityId);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "internal",
          message:
            err instanceof Error
              ? err.message
              : "Failed to retrieve approval queue.",
        },
      },
      { status: 500 },
    );
  }
}

export const GET = withServerErrors(handleGET);
