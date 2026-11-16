import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const doors = await defaultVmsRepository.listDoors();
    return NextResponse.json({
      ok: true,
      doors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "server",
          message:
            error instanceof Error ? error.message : "Failed to retrieve doors.",
        },
      },
      { status: 500 },
    );
  }
}
