import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/pre-registration/[visitId]/cancel", () => {
  it("cancels an existing pending visit and returns 200", async () => {
    const testVisit: Visit = {
      id: "vis-cancel-route-1",
      visitorGivenName: "Andi",
      visitorFamilyName: "Wijaya",
      visitReasonType: 0,
      scheduledStartTimeUtc: "2026-11-14T03:00:00Z",
      scheduledEndTimeUtc: "2026-11-14T05:00:00Z",
      scheduledStartTimeFacility: "2026-11-14T10:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-14T12:00:00+07:00",
      status: "PENDING_APPROVAL",
      createdAtUtc: "2026-11-13T00:00:00Z",
      updatedAtUtc: "2026-11-13T00:00:00Z",
    };

    await defaultVmsRepository.saveVisit(testVisit);

    const request = new Request("http://localhost/api/vms/pre-registration/vis-cancel-route-1/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Host unavailable" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "vis-cancel-route-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.visit?.status).toBe("CANCELLED");
    expect(body.visit?.remark).toMatch(/Host unavailable/i);
  });

  it("returns 404 when visitId does not exist", async () => {
    const request = new Request("http://localhost/api/vms/pre-registration/missing-id/cancel", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "missing-id" }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("not_found");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const request = new Request("http://localhost/api/vms/pre-registration/vis-1/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{",
    });

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "vis-1" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });
});
