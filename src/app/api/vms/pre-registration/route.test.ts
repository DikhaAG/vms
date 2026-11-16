import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { createSampleFaceJpegDataUri } from "@/lib/vms/face-normalizer";

describe("POST /api/vms/pre-registration", () => {
  const validPayload = {
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitorFamilyName: "Pratama",
    visitorGivenName: "Rian",
    visitorPhone: "+628123456789",
    visitorEmail: "rian@example.com",
    certificateType: 111,
    certificateNo: "3171012345670001",
    visitReasonType: 0,
    scheduledStartTime: "2026-11-13T10:00:00",
    scheduledEndTime: "2026-11-13T12:00:00",
    mode: "stub",
    stubScenario: "success",
  };

  it("returns 201 and visit details on valid pre-registration", async () => {
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.visit).toBeDefined();
    expect(body.visit.status).toBe("PENDING_APPROVAL");
    expect(body.visit.scheduledStartTimeUtc).toBe("2026-11-13T03:00:00.000Z");
    expect(body.visit.hikCentral?.appointRecordId).toMatch(/^apt-rec-/);
  });

  it("returns 400 when request body is not valid JSON", async () => {
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json-payload",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.kind).toBe("validation");
  });

  it("returns 400 when mandatory fields are missing", async () => {
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        visitorGivenName: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.fieldErrors.visitorGivenName).toBeDefined();
  });

  it("succeeds without requiring facilityId in payload", async () => {
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.visit.scheduledStartTimeFacility).toContain("+07:00");
  });

  it("formats appointment timestamps with timezone offset derived from system settings", async () => {
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.visit.scheduledStartTimeFacility).toBe("2026-11-13T10:00:00+07:00");
    expect(body.visit.scheduledEndTimeFacility).toBe("2026-11-13T12:00:00+07:00");
  });

  it("returns 502 when upstream HikCentral fails without leaking secrets", async () => {
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        mode: "stub",
        stubScenario: "network-error",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.kind).toBe("network");
  });

  it("successfully persists facePhoto and initializes credentialSyncStatus", async () => {
    const faceDataUri = createSampleFaceJpegDataUri();
    const request = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        facePhoto: faceDataUri,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.visit.facePhoto).toBe(faceDataUri);
    expect(body.visit.credentialSyncStatus).toBe("Applied");
  });
});