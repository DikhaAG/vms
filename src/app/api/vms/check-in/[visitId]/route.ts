import { NextResponse } from "next/server";
import { defaultCheckInService } from "@/lib/vms/checkin-service";

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

  const payload = {
    ...(body as Record<string, unknown>),
    visitId,
  };

  const result = await defaultCheckInService.performCheckIn(visitId, payload);

  if (!result.ok) {
    const status = result.error?.status ?? 500;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
      },
      { status },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        visit: result.visit,
        pass: result.pass,
      },
    },
    { status: 200 },
  );
}
