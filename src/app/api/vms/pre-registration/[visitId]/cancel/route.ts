import { NextResponse } from "next/server";
import { cancelVisit } from "@/lib/vms/pre-registration-service";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

async function handlePOST(
  request: Request,
  context: { params: Promise<{ visitId: string }> },
): Promise<NextResponse> {
  const { visitId } = await context.params;

  let reason: string | undefined;
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = await request.json();
      if (typeof body === "object" && body !== null) {
        const rec = body as Record<string, unknown>;
        if (typeof rec.reason === "string") {
          reason = rec.reason;
        }
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

  const result = await cancelVisit(visitId, reason);

  if (!result.ok) {
    const status = result.error?.status ?? 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}

export const POST = withServerErrors(handlePOST);
