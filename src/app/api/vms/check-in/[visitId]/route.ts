import { NextResponse } from "next/server";
import { defaultCheckInService } from "@/lib/vms/checkin-service";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

async function handlePOST(
  request: Request,
  context: { params: Promise<{ visitId: string }> },
): Promise<NextResponse> {
  const { visitId } = await context.params;
  let body: Record<string, unknown> = {};

  const rawText = await request.text();
  if (rawText.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              kind: "validation",
              message: "Request payload must be a JSON object.",
              status: 400,
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
            status: 400,
          },
        },
        { status: 400 },
      );
    }
  }

  const result = await defaultCheckInService.performCheckIn(visitId, {
    ...body,
    visitId,
  });

  if (!result.ok || !result.visit || !result.pass) {
    const status =
      result.error?.status ??
      (result.error?.kind === "not_found"
        ? 404
        : result.error?.kind === "invalid_state"
          ? 409
          : result.error?.kind === "validation"
            ? 400
            : 502);
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        visit: result.visit,
        pass: result.pass,
      },
      visit: result.visit,
      pass: result.pass,
    },
    { status: 200 },
  );
}

export const POST = withServerErrors(handlePOST);
