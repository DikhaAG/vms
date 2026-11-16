import { NextResponse } from "next/server";
import { defaultCheckInService } from "@/lib/vms/checkin-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
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

  const result = await defaultCheckInService.createWalkInVisit(body);
  if (!result.ok || !result.visit || !result.pass) {
    const status =
      result.error?.status ??
      (result.error?.kind === "validation" ? 400 : 502);
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
    { status: 201 },
  );
}