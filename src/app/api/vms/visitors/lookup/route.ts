import { NextResponse } from "next/server";
import { lookupReturningVisitor } from "@/lib/vms/group-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const certificateNo = searchParams.get("certificateNo")?.trim();

  if (!certificateNo) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Query parameter 'certificateNo' is required.",
        },
      },
      { status: 400 },
    );
  }

  const profile = await lookupReturningVisitor(certificateNo);

  if (!profile) {
    return NextResponse.json({
      ok: true,
      found: false,
    });
  }

  return NextResponse.json({
    ok: true,
    found: true,
    profile,
  });
}
