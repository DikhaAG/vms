import { NextResponse } from "next/server";
import { createGroupVisit } from "@/lib/vms/group-service";
import { validateGroupVisitInput } from "@/lib/vms/group-contract";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { withServerErrors } from "@/lib/vms/route-errors";

async function handlePOST(request: Request) {
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

  const validation = validateGroupVisitInput(rawBody);
  if (!validation.valid) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Group visit input validation failed.",
          fieldErrors: validation.errors,
        },
      },
      { status: 400 },
    );
  }

  const facility = await defaultVmsRepository.getFacility(
    validation.input.facilityId,
  );
  if (!facility) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${validation.input.facilityId}' not found.`,
        },
      },
      { status: 404 },
    );
  }

  try {
    const result = await createGroupVisit(validation.input);
    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "upstream",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create group visit.",
        },
      },
      { status: 500 },
    );
  }
}

export const POST = withServerErrors(handlePOST);
