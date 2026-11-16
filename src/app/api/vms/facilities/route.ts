import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { withServerErrors } from "@/lib/vms/route-errors";

export const dynamic = "force-dynamic";

async function handleGET(): Promise<NextResponse> {
  const facilities = await defaultVmsRepository.listFacilities();
  return NextResponse.json({ facilities });
}

export const GET = withServerErrors(handleGET);
