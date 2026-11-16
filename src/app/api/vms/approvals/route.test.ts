import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("GET /api/vms/approvals", () => {
  const visitPending: Visit = {
    id: "route-vis-pending",
    visitorFamilyName: "Santoso",
    visitorGivenName: "Dewi",
    certificateType: 111,
    certificateNo: "3171000000000002",
    visitReasonType: 0,
    scheduledStartTimeUtc: "2026-11-13T04:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T11:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
    status: "PENDING_APPROVAL",
    createdAtUtc: "2026-11-13T03:00:00Z",
    updatedAtUtc: "2026-11-13T03:00:00Z",
  };

  const visitEscalated: Visit = {
    id: "route-vis-escalated",
    visitorFamilyName: "Prohibited",
    visitorGivenName: "Person",
    certificateType: 111,
    certificateNo: "FLAG-001",
    visitReasonType: 0,
    scheduledStartTimeUtc: "2026-11-13T05:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T07:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T12:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T14:00:00+07:00",
    status: "SECURITY_ESCALATED",
    monitoringListFlag: {
      isFlagged: true,
      flaggedAtUtc: "2026-11-13T03:15:00Z",
      reason: "Blacklist match",
    },
    createdAtUtc: "2026-11-13T03:15:00Z",
    updatedAtUtc: "2026-11-13T03:15:00Z",
  };

  beforeEach(async () => {
    await defaultVmsRepository.saveVisit(visitPending);
    await defaultVmsRepository.saveVisit(visitEscalated);
  });

  it("returns review queue containing pending and escalated visits", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.totalCount).toBeGreaterThanOrEqual(2);
    expect(json.data.pendingVisits.some((v: Visit) => v.id === "route-vis-pending")).toBe(true);
    expect(json.data.escalatedVisits.some((v: Visit) => v.id === "route-vis-escalated")).toBe(true);
  });

  it("returns the site-wide queue across legacy facility tags", async () => {
    await defaultVmsRepository.saveVisit({
      ...visitPending,
      id: "route-vis-pending-bali",
    });
    const response = await GET();

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    const ids = json.data.allVisits.map((v: Visit) => v.id);
    expect(ids).toEqual(expect.arrayContaining(["route-vis-pending", "route-vis-pending-bali"]));
  });
});
