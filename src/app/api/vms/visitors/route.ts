import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { withServerErrors } from "@/lib/vms/route-errors";

async function handleGET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || undefined;
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  const profiles = await defaultVmsRepository.listVisitorProfiles({
    query,
    includeDeleted,
  });

  return NextResponse.json({
    ok: true,
    profiles,
  });
}

export const GET = withServerErrors(handleGET);
