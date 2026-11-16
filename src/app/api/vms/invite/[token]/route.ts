import { NextResponse } from "next/server";
import { getPublicInvitationMetadata } from "@/lib/vms/invitation-service";
import { processSelfRegistration } from "@/lib/vms/self-registration-service";
import type {
  SelfRegistrationResult,
  SelfRegistrationSubmissionInput,
} from "@/lib/vms/invitation-contract";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

export interface RouteContext {
  params: Promise<{
    token: string;
  }>;
}

function statusForSelfRegResult(result: SelfRegistrationResult): number {
  if (result.ok) {
    return 200;
  }
  switch (result.error?.kind) {
    case "validation":
      return 400;
    case "not_found":
      return 404;
    case "expired":
    case "consumed":
      return 410;
    case "config":
      return 500;
    default:
      return 502;
  }
}

/**
 * GET /api/vms/invite/[token]
 * Public endpoint to fetch invitation details and site metadata.
 * Returns 200 for valid active tokens, 404 for invalid/not-found, 410 for expired/consumed.
 */
async function handleGET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { token } = await context.params;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { ok: false, status: "invalid", message: "Token parameter is missing." },
      { status: 404 },
    );
  }

  const result = await getPublicInvitationMetadata(token);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: result.status,
        message: result.message,
      },
      { status: result.httpStatus },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: result.data,
    },
    { status: 200 },
  );
}

/**
 * POST /api/vms/invite/[token]
 * Public endpoint for external visitors to submit identity details and biometric face photo.
 * Enrolls appointment in HikCentral, consumes token to enforce single-use, returns QR pass.
 */
async function handlePOST(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { token } = await context.params;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      {
        ok: false,
        error: { kind: "not_found", message: "Token parameter is missing." },
      },
      { status: 404 },
    );
  }

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

  const result = await processSelfRegistration(
    token,
    body as SelfRegistrationSubmissionInput,
  );

  return NextResponse.json(result, { status: statusForSelfRegResult(result) });
}

export const GET = withServerErrors(handleGET);
export const POST = withServerErrors(handlePOST);
