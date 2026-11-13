import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";

describe("GET /api/vms/visitors/lookup", () => {
  it("returns 200 and profile data when an active returning visitor is found", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-lookup-1",
      certificateType: 111,
      certificateNo: "3171012345670099",
      fullName: "Maya Safitri",
      familyName: "Safitri",
      givenName: "Maya",
      phone: "+628119876543",
      email: "maya@example.com",
      facePhoto: "data:image/jpeg;base64,sample-photo",
      isDeleted: false,
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    const request = new Request(
      "http://localhost:3000/api/vms/visitors/lookup?certificateNo=3171012345670099",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.found).toBe(true);
    expect(body.profile).toBeDefined();
    expect(body.profile.fullName).toBe("Maya Safitri");
    expect(body.profile.phone).toBe("+628119876543");
    expect(body.profile.facePhoto).toBe("data:image/jpeg;base64,sample-photo");
  });

  it("returns 200 and found=false when certificate is unknown", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/visitors/lookup?certificateNo=UNKNOWN-ID-999",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.found).toBe(false);
    expect(body.profile).toBeUndefined();
  });

  it("returns 200 and found=false when visitor profile is soft-deleted", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-lookup-del",
      certificateType: 111,
      certificateNo: "3171099999990088",
      fullName: "Deleted User",
      familyName: "User",
      givenName: "Deleted",
      isDeleted: true,
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    const request = new Request(
      "http://localhost:3000/api/vms/visitors/lookup?certificateNo=3171099999990088",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.found).toBe(false);
  });

  it("returns 400 when certificateNo query parameter is missing", async () => {
    const request = new Request("http://localhost:3000/api/vms/visitors/lookup");
    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
  });
});
