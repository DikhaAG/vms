import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("GET /api/vms/check-in/search", () => {
  const sampleVisit: Visit = {
    id: "route-search-vis-01",
    facilityId: "fac-jakarta",
    facilityName: "Jakarta Corporate HQ",
    visitorFamilyName: "Kusuma",
    visitorGivenName: "Bambang",
    visitorPhone: "+6281299990001",
    certificateType: 111,
    certificateNo: "3171999999990001",
    visitReasonType: 0,
    scheduledStartTimeUtc: "2026-11-13T02:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T09:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
    status: "APPROVED",
    createdAtUtc: "2026-11-13T01:00:00Z",
    updatedAtUtc: "2026-11-13T01:00:00Z",
  };

  beforeEach(async () => {
    await defaultVmsRepository.saveVisit(sampleVisit);
  });

  it("returns matching visits for query and facilityId", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/search?q=Bambang&facilityId=fac-jakarta",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe("route-search-vis-01");
  });

  it("returns empty array if no visits match query", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/check-in/search?q=NoSuchPerson",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data).toEqual([]);
  });
});
