import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";

describe("GET /api/vms/visitors", () => {
  it("returns 200 with list of active visitor profiles", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-list-1",
      certificateType: 111,
      certificateNo: "3171012345670101",
      fullName: "Anita Wijaya",
      familyName: "Wijaya",
      givenName: "Anita",
      isDeleted: false,
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    const request = new Request("http://localhost:3000/api/vms/visitors");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.profiles.some((p: { id: string }) => p.id === "prof-list-1")).toBe(true);
  });

  it("filters profiles using query parameter", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-list-unique",
      certificateType: 111,
      certificateNo: "3171012345679999",
      fullName: "UniqueNameQueryTest",
      familyName: "QueryTest",
      givenName: "UniqueName",
      isDeleted: false,
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    const request = new Request(
      "http://localhost:3000/api/vms/visitors?query=UniqueName",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.profiles).toHaveLength(1);
    expect(body.profiles[0].id).toBe("prof-list-unique");
  });

  it("includes soft-deleted profiles when includeDeleted=true", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-list-deleted",
      certificateType: 111,
      certificateNo: "3171012345670202",
      fullName: "Deleted Account",
      familyName: "Account",
      givenName: "Deleted",
      isDeleted: true,
      deletionReason: "PDP erasure",
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    // Without includeDeleted
    const req1 = new Request("http://localhost:3000/api/vms/visitors");
    const res1 = await GET(req1);
    const body1 = await res1.json();
    expect(body1.profiles.some((p: { id: string }) => p.id === "prof-list-deleted")).toBe(false);

    // With includeDeleted=true
    const req2 = new Request(
      "http://localhost:3000/api/vms/visitors?includeDeleted=true",
    );
    const res2 = await GET(req2);
    const body2 = await res2.json();
    expect(body2.profiles.some((p: { id: string }) => p.id === "prof-list-deleted")).toBe(true);
  });
});
