import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";

export async function GET(request: Request) {
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
