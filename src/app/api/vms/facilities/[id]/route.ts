import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { validateUpdateFacilityInput } from "@/lib/vms/vms-contract";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const facility = await defaultVmsRepository.getFacility(id);

  if (!facility) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${id}' not found.`,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, facility }, { status: 200 });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const validation = validateUpdateFacilityInput(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Facility input validation failed.",
          fieldErrors: validation.errors,
        },
      },
      { status: 400 },
    );
  }

  const existing = await defaultVmsRepository.getFacility(id);
  if (!existing) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${id}' not found.`,
        },
      },
      { status: 404 },
    );
  }

  const updated = await defaultVmsRepository.updateFacility(id, validation.input);

  return NextResponse.json(
    {
      ok: true,
      facility: updated,
    },
    { status: 200 },
  );
}
