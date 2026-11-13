import { describe, expect, it } from "vitest";
import { GET as getFacilities } from "@/app/api/vms/facilities/route";
import { POST as postPreRegistration } from "@/app/api/vms/pre-registration/route";
import { POST as postRetrySync } from "@/app/api/vms/credentials/retry-sync/route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Facility, PreRegistrationResult } from "@/lib/vms/vms-contract";
import {
  createSampleFaceJpegDataUri,
  normalizeFaceImage,
  isFacePhotoSizeValid,
} from "@/lib/vms/face-normalizer";
import { NextRequest } from "next/server";

describe("E2E Tracer Bullet: Multi-Timezone Host Pre-Registration", () => {
  it("executes the complete facility selection, scheduling, timezone translation, and appointment dispatch flow", async () => {
    // 1. Fetch available facilities
    const facilitiesResponse = await getFacilities();
    expect(facilitiesResponse.status).toBe(200);

    const facilitiesBody = (await facilitiesResponse.json()) as {
      facilities: Facility[];
    };
    expect(facilitiesBody.facilities.length).toBeGreaterThanOrEqual(3);

    const jakarta = facilitiesBody.facilities.find(
      (f) => f.id === "fac-jakarta",
    )!;
    expect(jakarta).toBeDefined();
    expect(jakarta.timezone).toBe("Asia/Jakarta");

    const bali = facilitiesBody.facilities.find((f) => f.id === "fac-bali")!;
    expect(bali).toBeDefined();
    expect(bali.timezone).toBe("Asia/Makassar");

    // 2. Submit pre-registration for Jakarta facility (UTC+7)
    const jakartaPayload = {
      facilityId: "fac-jakarta",
      hostId: "emp-host-01",
      hostName: "Budi Santoso",
      visitorFamilyName: "Tanaka",
      visitorGivenName: "Kenji",
      visitorPhone: "+628111222333",
      visitorEmail: "kenji@example.com",
      certificateType: 111,
      certificateNo: "3171012345670001",
      visitReasonType: 0, // Business
      scheduledStartTime: "2026-11-13T10:00:00",
      scheduledEndTime: "2026-11-13T12:00:00",
      mode: "stub",
      stubScenario: "success",
    };

    const reqJakarta = new Request(
      "http://localhost:3000/api/vms/pre-registration",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jakartaPayload),
      },
    );

    const resJakarta = await postPreRegistration(reqJakarta);
    expect(resJakarta.status).toBe(201);

    const resJakartaBody =
      (await resJakarta.json()) as PreRegistrationResult;
    expect(resJakartaBody.ok).toBe(true);

    const visitJakarta = resJakartaBody.visit!;
    expect(visitJakarta.status).toBe("PENDING_APPROVAL");
    expect(visitJakarta.facilityId).toBe("fac-jakarta");
    expect(visitJakarta.facilityName).toBe("Jakarta Corporate HQ");

    // Timezone translation check (Jakarta 10:00 WIB -> 03:00 UTC)
    expect(visitJakarta.scheduledStartTimeUtc).toBe("2026-11-13T03:00:00.000Z");
    expect(visitJakarta.scheduledEndTimeUtc).toBe("2026-11-13T05:00:00.000Z");
    expect(visitJakarta.scheduledStartTimeFacility).toBe(
      "2026-11-13T10:00:00+07:00",
    );
    expect(visitJakarta.scheduledEndTimeFacility).toBe(
      "2026-11-13T12:00:00+07:00",
    );

    // HikCentral returned references
    expect(visitJakarta.hikCentral?.appointRecordId).toMatch(/^apt-rec-/);
    expect(visitJakarta.hikCentral?.visitorId).toMatch(/^vis-/);
    expect(visitJakarta.hikCentral?.appointCode).toBeDefined();
    expect(visitJakarta.hikCentral?.qrCodeImage).toBeDefined();

    // Verify persisted in repository
    const storedVisit = await defaultVmsRepository.getVisit(visitJakarta.id);
    expect(storedVisit).toEqual(visitJakarta);

    // 3. Submit pre-registration for Bali facility (UTC+8) at the same local clock time (10:00)
    const baliPayload = {
      ...jakartaPayload,
      facilityId: "fac-bali",
      visitorGivenName: "Yuki",
    };

    const reqBali = new Request(
      "http://localhost:3000/api/vms/pre-registration",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baliPayload),
      },
    );

    const resBali = await postPreRegistration(reqBali);
    expect(resBali.status).toBe(201);

    const resBaliBody = (await resBali.json()) as PreRegistrationResult;
    const visitBali = resBaliBody.visit!;
    // Bali 10:00 WITA -> 02:00 UTC
    expect(visitBali.scheduledStartTimeUtc).toBe("2026-11-13T02:00:00.000Z");
    expect(visitBali.scheduledEndTimeUtc).toBe("2026-11-13T04:00:00.000Z");
    expect(visitBali.scheduledStartTimeFacility).toBe(
      "2026-11-13T10:00:00+08:00",
    );
    expect(visitBali.scheduledEndTimeFacility).toBe("2026-11-13T12:00:00+08:00");
  });

  it("handles upstream failures gracefully without leaking internal secrets", async () => {
    const errorPayload = {
      facilityId: "fac-jakarta",
      visitorFamilyName: "Smith",
      visitorGivenName: "Alice",
      scheduledStartTime: "2026-11-13T10:00:00",
      scheduledEndTime: "2026-11-13T12:00:00",
      visitReasonType: 0,
      mode: "stub",
      stubScenario: "auth-error",
    };

    const req = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorPayload),
    });

    const res = await postPreRegistration(req);
    expect(res.status).toBe(502);

    const body = (await res.json()) as PreRegistrationResult;
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("upstream");
    // Ensure no secrets or sensitive internals leaked
    const jsonString = JSON.stringify(body);
    expect(jsonString).not.toContain("HIKCENTRAL_APP_SECRET");
    expect(jsonString).not.toContain("password");
  });

  it("handles biometric face normalization, appointment binding, and credential sync reapplication", async () => {
    // 1. Generate & normalize sample face photo
    const sampleUri = createSampleFaceJpegDataUri(15000);
    const normalized = await normalizeFaceImage(sampleUri);

    expect(isFacePhotoSizeValid(normalized.byteSize)).toBe(true);
    expect(normalized.dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);

    // 2. Submit pre-registration with biometric face photo
    const payloadWithFace = {
      facilityId: "fac-jakarta",
      hostId: "emp-host-01",
      visitorFamilyName: "Kusuma",
      visitorGivenName: "Citra",
      visitorPhone: "+6281999888777",
      certificateType: 111,
      certificateNo: "3171099988870002",
      visitReasonType: 3,
      scheduledStartTime: "2026-11-13T14:00:00",
      scheduledEndTime: "2026-11-13T16:00:00",
      facePhoto: normalized.dataUri,
      mode: "stub",
      stubScenario: "success",
    };

    const req = new Request("http://localhost:3000/api/vms/pre-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadWithFace),
    });

    const res = await postPreRegistration(req);
    expect(res.status).toBe(201);

    const body = (await res.json()) as PreRegistrationResult;
    expect(body.ok).toBe(true);

    const visit = body.visit!;
    expect(visit.facePhoto).toBe(normalized.dataUri);
    expect(visit.credentialSyncStatus).toBe("Applied");
    expect(visit.hikCentral?.visitorId).toBeDefined();

    // 3. Trigger manual credential reapplication (Retry Sync)
    const retryReq = new NextRequest(
      "http://localhost:3000/api/vms/credentials/retry-sync",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId: visit.hikCentral!.visitorId,
          mode: "stub",
          stubScenario: "success",
        }),
      },
    );

    const retryRes = await postRetrySync(retryReq);
    expect(retryRes.status).toBe(200);

    const retryBody = (await retryRes.json()) as {
      ok: boolean;
      syncStatus: string;
      message: string;
    };
    expect(retryBody.ok).toBe(true);
    expect(retryBody.syncStatus).toBe("Applied");
    expect(retryBody.message).toMatch(/triggered/i);
  });

  it("executes the complete visitor self-registration flow via secure invitation link (Ticket 03)", async () => {
    const { POST: postInvite } = await import("@/app/api/vms/invite/route");
    const { GET: getInviteMeta, POST: postSelfReg } = await import(
      "@/app/api/vms/invite/[token]/route"
    );

    // 1. Host creates invitation link
    const invitePayload = {
      facilityId: "fac-jayapura",
      hostId: "emp-host-03",
      hostName: "Lukas Enembe",
      visitReasonType: 2, // Visit
      visitReasonDetail: "Infrastructure On-Site Inspection",
      scheduledStartTime: "2026-11-25T14:00",
      scheduledEndTime: "2026-11-25T16:00",
      mode: "stub",
      stubScenario: "success",
    };

    const hostReq = new Request("http://localhost:3000/api/vms/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invitePayload),
    });

    const hostRes = await postInvite(hostReq);
    expect(hostRes.status).toBe(201);
    const hostBody = await hostRes.json();
    expect(hostBody.ok).toBe(true);
    expect(hostBody.invitation.token).toBeDefined();
    expect(hostBody.inviteUrl).toMatch(/^\/invite\//);
    const token = hostBody.invitation.token as string;

    // 2. Visitor opens public link and browser fetches invitation metadata
    const metaReq = new Request(`http://localhost:3000/api/vms/invite/${token}`);
    const metaRes = await getInviteMeta(metaReq, {
      params: Promise.resolve({ token }),
    });
    expect(metaRes.status).toBe(200);
    const metaBody = await metaRes.json();
    expect(metaBody.ok).toBe(true);
    expect(metaBody.data.facility.name).toBe("Jayapura Logistics Hub");
    expect(metaBody.data.facility.timezone).toBe("Asia/Jayapura");
    expect(metaBody.data.host.name).toBe("Lukas Enembe");
    expect(metaBody.data.scheduledStartTimeFacility).toBe(
      "2026-11-25T14:00:00+09:00",
    );

    // 3. Visitor captures compliant selfie and submits self-registration
    const selfiePhoto = createSampleFaceJpegDataUri(28 * 1024);
    const visitorPayload = {
      visitorFamilyName: "Wamena",
      visitorGivenName: "Karel",
      visitorPhone: "+628999888777",
      visitorEmail: "karel.wamena@example.com",
      certificateType: 111,
      certificateNo: "9171012345670001",
      facePhoto: selfiePhoto,
      mode: "stub",
      stubScenario: "success",
    };

    const selfRegReq = new Request(
      `http://localhost:3000/api/vms/invite/${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitorPayload),
      },
    );

    const selfRegRes = await postSelfReg(selfRegReq, {
      params: Promise.resolve({ token }),
    });
    expect(selfRegRes.status).toBe(200);
    const selfRegBody = await selfRegRes.json();
    expect(selfRegBody.ok).toBe(true);
    expect(selfRegBody.visit).toBeDefined();
    expect(selfRegBody.visit.status).toBe("PENDING_APPROVAL");
    expect(selfRegBody.visit.visitorFamilyName).toBe("Wamena");
    expect(selfRegBody.visit.visitorGivenName).toBe("Karel");
    expect(selfRegBody.visit.scheduledStartTimeFacility).toBe(
      "2026-11-25T14:00:00+09:00",
    );

    // Digital QR Pass is issued
    expect(selfRegBody.qrPass).toBeDefined();
    expect(selfRegBody.qrPass.appointRecordId).toMatch(/^apt-rec-/);
    expect(selfRegBody.qrPass.appointCode).toBeDefined();
    expect(selfRegBody.qrPass.qrCodeImage).toBeDefined();

    // 4. Token cannot be re-used (single-use enforcement)
    const secondSubmit = await postSelfReg(
      new Request(`http://localhost:3000/api/vms/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitorPayload),
      }),
      { params: Promise.resolve({ token }) },
    );
    expect(secondSubmit.status).toBe(410);

    // Metadata endpoint also now reports consumed
    const metaAfterConsumed = await getInviteMeta(metaReq, {
      params: Promise.resolve({ token }),
    });
    expect(metaAfterConsumed.status).toBe(410);
  });
});
