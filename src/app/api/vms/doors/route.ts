import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const doors = await defaultVmsRepository.listDoors();
  return NextResponse.json({
    ok: true,
    doors,
  });
}