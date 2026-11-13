import { NextResponse } from "next/server";
import { defaultCheckInService } from "@/lib/vms/checkin-service";

export async function POST(request: Request) {
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

  const result = await defaultCheckInService.createWalkInVisit(body);

  if (!result.ok) {
    const status = result.error?.status ?? 400;
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
    { status: 201 },
  );
}
