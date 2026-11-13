import { describe, expect, it } from "vitest";
import { PATCH } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";

describe("PATCH /api/vms/visitors/[id]/soft-delete", () => {
  it("soft-deletes an active visitor profile and returns 200", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-patch-1",
      certificateType: 111,
      certificateNo: "3171012345670303",
      fullName: "Target User",
      familyName: "User",
      givenName: "Target",
      isDeleted: false,
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    const request = new Request(
      "http://localhost:3000/api/vms/visitors/prof-patch-1/soft-delete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDeleted: true,
          reason: "User requested personal data erasure under PDP compliance",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "prof-patch-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.profile.isDeleted).toBe(true);
    expect(body.profile.deletionReason).toBe(
      "User requested personal data erasure under PDP compliance",
    );
    expect(body.profile.deletedAtUtc).toBeDefined();
  });

  it("restores a soft-deleted visitor profile and returns 200", async () => {
    await defaultVmsRepository.saveVisitorProfile({
      id: "prof-patch-restore",
      certificateType: 111,
      certificateNo: "3171012345670404",
      fullName: "Restored User",
      familyName: "User",
      givenName: "Restored",
      isDeleted: true,
      deletionReason: "Archived",
      createdAtUtc: "2026-11-10T08:00:00.000Z",
      updatedAtUtc: "2026-11-10T08:00:00.000Z",
    });

    const request = new Request(
      "http://localhost:3000/api/vms/visitors/prof-patch-restore/soft-delete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDeleted: false,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "prof-patch-restore" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.profile.isDeleted).toBe(false);
  });

  it("returns 400 when payload is invalid", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/visitors/prof-patch-1/soft-delete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDeleted: "not-a-boolean",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "prof-patch-1" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
  });

  it("returns 404 when visitor profile is not found", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/visitors/prof-not-found/soft-delete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isDeleted: true,
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "prof-not-found" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("not_found");
  });
});
