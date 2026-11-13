import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const facilities = await defaultVmsRepository.listFacilities();
  return NextResponse.json({ facilities });
}
