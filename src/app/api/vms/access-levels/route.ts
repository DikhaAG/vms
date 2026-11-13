import { NextResponse } from "next/server";
import {
  listAccessLevelsService,
  createAccessLevelService,
} from "@/lib/vms/access-level-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const facilityId = url.searchParams.get("facilityId") || undefined;

    const accessLevels = await listAccessLevelsService({ facilityId });

    return NextResponse.json({
      ok: true,
      accessLevels,
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
              : "Failed to list access levels.",
        },
      },
      { status: 500 },
    );
  }
}

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

  const result = await createAccessLevelService(body);

  if (!result.ok) {
    const status =
      result.error?.kind === "validation"
        ? 400
        : result.error?.kind === "not_found"
          ? 404
          : result.error?.status ?? 500;

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
      accessLevel: result.accessLevel,
    },
    { status: 201 },
  );
}
