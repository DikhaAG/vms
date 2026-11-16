import { NextResponse } from "next/server";
import { listPendingApprovals } from "@/lib/vms/approval-service";
import { withServerErrors } from "@/lib/vms/route-errors";

async function handleGET() {
  try {
    const data = await listPendingApprovals();

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
