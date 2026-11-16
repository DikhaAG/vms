import { NextResponse } from "next/server";
import { createPreRegistration } from "@/lib/vms/pre-registration-service";
import type { PreRegistrationResult } from "@/lib/vms/vms-contract";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

function statusForResult(result: PreRegistrationResult): number {
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

async function handlePOST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errorResult: PreRegistrationResult = {
      ok: false,
      error: {
        kind: "validation",
        message: "Request body must be valid JSON.",
        status: 400,
      },
    };
    return NextResponse.json(errorResult, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    const errorResult: PreRegistrationResult = {
      ok: false,
      error: {
        kind: "validation",
        message: "Request payload must be a JSON object.",
        status: 400,
      },
    };
    return NextResponse.json(errorResult, { status: 400 });
  }

  const result = await createPreRegistration(body);
  return NextResponse.json(result, { status: statusForResult(result) });
}

export const POST = withServerErrors(handlePOST);
