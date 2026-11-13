import { NextResponse } from "next/server";
import { setProfileSoftDelete } from "@/lib/vms/group-service";
import { validateSoftDeleteInput } from "@/lib/vms/group-contract";
import { defaultVmsRepository } from "@/lib/vms/repository";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Malformed JSON in request body.",
        },
      },
      { status: 400 },
    );
  }

  const validation = validateSoftDeleteInput(rawBody);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Invalid soft delete payload.",
          fieldErrors: validation.errors,
        },
      },
      { status: 400 },
    );
  }

  const existing = await defaultVmsRepository.getVisitorProfile(id);
  if (!existing) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not_found",
          message: `Visitor profile '${id}' not found.`,
        },
      },
      { status: 404 },
    );
  }

  try {
    const profile = await setProfileSoftDelete(
      id,
      validation.input.isDeleted,
      validation.input.reason,
    );

    return NextResponse.json({
      ok: true,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "upstream",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update profile soft delete status.",
        },
      },
      { status: 500 },
    );
  }
}
