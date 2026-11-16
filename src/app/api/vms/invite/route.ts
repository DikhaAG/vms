import { NextResponse } from "next/server";
import { createInvitation } from "@/lib/vms/invitation-service";
import type {
  CreateInvitationInput,
  CreateInvitationResult,
} from "@/lib/vms/invitation-contract";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

function statusForCreateResult(result: CreateInvitationResult): number {
  if (result.ok) {
    return 201;
  }
  switch (result.error?.kind) {
    case "validation":
      return 400;
    case "not_found":
      return 404;
    case "config":
      return 500;
    default:
      return 502;
  }
}

/**
 * POST /api/vms/invite
 * Host action to generate an invitation link for upcoming visit.
 */
async function handlePOST(request: Request): Promise<NextResponse> {
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

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Request payload must be a JSON object.",
        },
      },
      { status: 400 },
    );
  }

  const result = await createInvitation(body as CreateInvitationInput);
  return NextResponse.json(result, { status: statusForCreateResult(result) });
}

export const POST = withServerErrors(handlePOST);
