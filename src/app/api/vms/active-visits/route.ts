import { NextResponse } from "next/server";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const activeVisits = await defaultActiveMonitoringService.getActiveVisits();
    const totalOnPremise = activeVisits.length;
    const overstayAlerts = activeVisits.filter((v) => v.isOverstay).length;
    const quotaWarnings = activeVisits.filter(
      (v) =>
        v.isQuotaExceeded ||
        (v.tapQuotaMode === "limited" &&
          v.maxTaps > 0 &&
          v.tapCount >= v.maxTaps - 1),
    ).length;
    const normal = Math.max(0, totalOnPremise - overstayAlerts);

    return NextResponse.json({
      ok: true,
      activeVisits,
      summary: {
        totalOnPremise,
        normal,
        overstayAlerts,
        quotaWarnings,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "server",
          message:
            error instanceof Error
              ? error.message
              : "Failed to retrieve active visits.",
        },
      },
      { status: 500 },
    );
  }
}
