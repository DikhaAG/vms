import { describe, expect, it } from "vitest";
import { GET as getFacilities } from "@/app/api/vms/facilities/route";
import { POST as postPreRegistration } from "@/app/api/vms/pre-registration/route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { Facility, PreRegistrationResult } from "@/lib/vms/vms-contract";

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
});
