import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const facilityId = url.searchParams.get("facilityId") || undefined;
    const doors = await defaultVmsRepository.listDoors(facilityId);

    return NextResponse.json({
      ok: true,
      doors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve facility doors";
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "server",
          message,
        },
      },
      { status: 500 },
    );
  }
}

