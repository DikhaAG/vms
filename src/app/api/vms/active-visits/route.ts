import { NextResponse } from "next/server";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const facilityId = url.searchParams.get("facilityId") || undefined;

    const activeVisits =
      await defaultActiveMonitoringService.getActiveVisits(facilityId);

    const totalOnPremise = activeVisits.length;
    const overstayAlerts = activeVisits.filter((v) => v.isOverstay).length;
    const quotaWarnings = activeVisits.filter(
      (v) =>
        v.isQuotaExceeded ||
        (v.tapQuotaMode === "limited" && v.maxTaps > 0 && v.tapCount >= v.maxTaps - 1),
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
    const message =
      error instanceof Error ? error.message : "Failed to retrieve active visits";
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
