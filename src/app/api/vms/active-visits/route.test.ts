import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
import { defaultActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";
import type { ActiveVisitSummary } from "@/lib/vms/checkout-contract";

describe("GET /api/vms/active-visits", () => {
  beforeEach(async () => {
    // Reset/seed visits in defaultVmsRepository
    const activeVisit: Visit = {
      id: "vis-api-act-1",
      visitorGivenName: "Diana",
      visitorFamilyName: "Prince",
      visitReasonType: 3,
      scheduledStartTimeUtc: "2026-11-13T08:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T10:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T15:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T17:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T08:05:00.000Z",
      status: "CHECKED_IN",
      tapCount: 1,
      tapQuota: {
        mode: "limited",
        maxTaps: 3,
      },
      createdAtUtc: "2026-11-13T07:00:00.000Z",
      updatedAtUtc: "2026-11-13T08:05:00.000Z",
    };

    const checkedOutVisit: Visit = {
      id: "vis-api-out-1",
      visitorGivenName: "Clark",
      visitorFamilyName: "Kent",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-13T06:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-13T07:00:00.000Z",
      scheduledStartTimeFacility: "2026-11-13T13:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-13T14:00:00+07:00",
      actualCheckInTimeUtc: "2026-11-13T06:05:00.000Z",
      actualCheckOutTimeUtc: "2026-11-13T07:00:00.000Z",
      status: "CHECKED_OUT",
      createdAtUtc: "2026-11-13T05:00:00.000Z",
      updatedAtUtc: "2026-11-13T07:00:00.000Z",
    };

    await defaultVmsRepository.saveVisit(activeVisit);
    await defaultVmsRepository.saveVisit(checkedOutVisit);
  });

  it("returns active on-premise visits and summary metrics", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.activeVisits)).toBe(true);
    expect(json.activeVisits.length).toBeGreaterThanOrEqual(1);

    const found = json.activeVisits.find((v: ActiveVisitSummary) => v.visitId === "vis-api-act-1");
    expect(found).toBeDefined();
    expect(found.visitor.fullName).toBe("Diana Prince");
    expect(found.tapCount).toBe(1);
    expect(found.maxTaps).toBe(3);

    expect(json.summary).toBeDefined();
    expect(typeof json.summary.totalOnPremise).toBe("number");
    expect(typeof json.summary.normal).toBe("number");
    expect(typeof json.summary.overstayAlerts).toBe("number");
    expect(typeof json.summary.quotaWarnings).toBe("number");
  });

  it("returns all active visits across the single site regardless of legacy facilityId query param", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    const foundDiana = json.activeVisits.find(
      (v: ActiveVisitSummary) => v.visitId === "vis-api-act-1",
    );
    expect(foundDiana).toBeDefined();
  });

  it("returns a structured 500 when the monitoring service throws", async () => {
    const spy = vi
      .spyOn(defaultActiveMonitoringService, "getActiveVisits")
      .mockRejectedValueOnce(new Error("db down"));
    try {
      const res = await GET();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        ok: false,
        error: { kind: "server", message: "db down" },
      });
    } finally {
      spy.mockRestore();
    }
  });
});
