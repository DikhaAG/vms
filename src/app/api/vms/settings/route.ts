import { NextResponse } from "next/server";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { validateUpdateSystemSettingsInput } from "@/lib/vms/vms-contract";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await defaultVmsRepository.getSettings();
    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve system settings";
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

export async function PUT(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: "Request body must be valid JSON",
          },
        },
        { status: 400 },
      );
    }

    const validation = validateUpdateSystemSettingsInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: "Invalid system settings payload",
            fieldErrors: validation.errors,
          },
        },
        { status: 400 },
      );
    }

    const updated = await defaultVmsRepository.updateSettings(validation.input);
    return NextResponse.json({
      ok: true,
      settings: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update system settings";
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
