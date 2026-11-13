import { NextResponse } from "next/server";
import {
  getAccessLevelService,
  updateAccessLevelService,
  deleteAccessLevelService,
} from "@/lib/vms/access-level-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const accessLevel = await getAccessLevelService(id);
  if (!accessLevel) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not_found",
          message: `Access level '${id}' not found.`,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    accessLevel,
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

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

  const result = await updateAccessLevelService(id, body);

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

  return NextResponse.json({
    ok: true,
    accessLevel: result.accessLevel,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const result = await deleteAccessLevelService(id);

  if (!result.ok) {
    const status =
      result.error?.kind === "not_found"
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

  return NextResponse.json({
    ok: true,
  });
}
