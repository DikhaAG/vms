import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Visit } from "@/lib/vms/vms-contract";

describe("POST /api/vms/approvals/[visitId]", () => {
  const visitToApprove: Visit = {
    id: "route-vis-to-approve",
    facilityId: "fac-jakarta",
    facilityName: "Jakarta Corporate HQ",
    visitorFamilyName: "Gunawan",
    visitorGivenName: "Indra",
    certificateType: 111,
    certificateNo: "3171000000000003",
    visitReasonType: 3,
    scheduledStartTimeUtc: "2026-11-13T04:00:00Z",
    scheduledEndTimeUtc: "2026-11-13T06:00:00Z",
    scheduledStartTimeFacility: "2026-11-13T11:00:00+07:00",
    scheduledEndTimeFacility: "2026-11-13T13:00:00+07:00",
    status: "PENDING_APPROVAL",
    createdAtUtc: "2026-11-13T03:00:00Z",
    updatedAtUtc: "2026-11-13T03:00:00Z",
  };

  beforeEach(async () => {
    await defaultVmsRepository.saveVisit(visitToApprove);
  });

  it("successfully approves a visit and returns 200 with updated visit and approval record", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/approvals/route-vis-to-approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          comment: "Approved by manager",
          approverName: "Sarah Connor",
          approverId: "mgr-01",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-vis-to-approve" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.visit.status).toBe("APPROVED");
    expect(json.data.approvalRecord.action).toBe("approve");
    expect(json.data.approvalRecord.approverName).toBe("Sarah Connor");
  });

  it("successfully rejects a visit with required comment and returns 200", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/approvals/route-vis-to-approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          comment: "Schedule conflict; meeting cancelled",
          approverName: "Sarah Connor",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-vis-to-approve" }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.data.visit.status).toBe("REJECTED");
    expect(json.data.approvalRecord.action).toBe("reject");
  });

  it("returns 400 when rejecting without a comment", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/approvals/route-vis-to-approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          comment: "",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-vis-to-approve" }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error?.kind).toBe("validation");
    expect(json.error?.fieldErrors?.comment).toBeDefined();
  });

  it("returns 404 when visit is not found", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/approvals/non-existent-visit-id",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "non-existent-visit-id" }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error?.kind).toBe("not_found");
  });

  it("returns 409 conflict when visit is already approved", async () => {
    // First approval
    await defaultVmsRepository.updateVisit("route-vis-to-approve", {
      status: "APPROVED",
    });

    const request = new Request(
      "http://localhost:3000/api/vms/approvals/route-vis-to-approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-vis-to-approve" }),
    });

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error?.kind).toBe("conflict");
  });

  it("returns 400 when request body contains invalid JSON", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/approvals/route-vis-to-approve",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json-payload",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ visitId: "route-vis-to-approve" }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.error?.kind).toBe("validation");
  });
});
