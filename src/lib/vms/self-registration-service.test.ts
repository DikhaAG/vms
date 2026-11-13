import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository } from "./repository";
import { createInvitation } from "./invitation-service";
import { processSelfRegistration } from "./self-registration-service";
import { createSampleFaceJpegDataUri } from "./face-normalizer";
import type { HikCentralAppointmentSuccess } from "./hikcentral-appointment-adapter";
import { HikCentralError } from "../hikcentral/client";

describe("self-registration-service", () => {
  let repository: InMemoryVmsRepository;
  const mockNow = new Date("2026-11-13T08:00:00.000Z");

  const compliantPhotoBase64 = createSampleFaceJpegDataUri(25 * 1024);

  const mockHikAppointmentSuccess: HikCentralAppointmentSuccess = {
    appointRecordId: "hik-rec-self-001",
    visitorId: "hik-vis-self-001",
    appointCode: "PASS-7788",
    qrCodeImage: "data:image/png;base64,mockqrpngbase64data",
  };

  beforeEach(() => {
    repository = new InMemoryVmsRepository();
  });

  async function createTestInvite() {
    const res = await createInvitation(
      {
        facilityId: "fac-jakarta",
        hostName: "Hendra Wijaya",
        hostId: "emp-hendra",
        visitReasonType: 0,
        scheduledStartTime: "2026-11-20T10:00",
        scheduledEndTime: "2026-11-20T12:00",
      },
      { repository, now: () => mockNow },
    );
    return res.invitation!.token;
  }

  it("processes self-registration with personal details and face photo", async () => {
    const token = await createTestInvite();

    let dispatchedParams: Record<string, unknown> | undefined;
    const mockDispatcher = async (params: Record<string, unknown>) => {
      dispatchedParams = params;
      return mockHikAppointmentSuccess;
    };

    const result = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
        visitorPhone: "+628123456789",
        visitorEmail: "budi.prasetyo@example.com",
        certificateType: 111,
        certificateNo: "3271012345670001",
        facePhoto: compliantPhotoBase64,
      },
      {
        repository,
        appointmentDispatcher: mockDispatcher as unknown as typeof processSelfRegistration extends (
          t: string,
          s: unknown,
          deps?: infer D,
        ) => unknown
          ? D extends { appointmentDispatcher?: infer T }
            ? T
            : never
          : never,
        now: () => mockNow,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.visit).toBeDefined();
    expect(result.visit?.status).toBe("PENDING_APPROVAL");
    expect(result.visit?.visitorFamilyName).toBe("Prasetyo");
    expect(result.visit?.visitorGivenName).toBe("Budi");
    expect(result.visit?.certificateNo).toBe("3271012345670001");
    expect(result.visit?.facePhoto).toContain("data:image/jpeg;base64,");

    expect(result.qrPass).toBeDefined();
    expect(result.qrPass?.appointCode).toBe("PASS-7788");
    expect(result.qrPass?.qrCodeImage).toBe(
      "data:image/png;base64,mockqrpngbase64data",
    );

    // Verify HikCentral was invoked with correct parameters
    expect(dispatchedParams).toBeDefined();
    expect(dispatchedParams?.visitorFamilyName).toBe("Prasetyo");
    expect(dispatchedParams?.visitorGivenName).toBe("Budi");
    expect(dispatchedParams?.appointStartTime).toBe(
      "2026-11-20T10:00:00+07:00",
    );
    // Face photo wire payload must not have data: prefix
    expect(dispatchedParams?.facePhotoData).not.toContain("data:image");

    // Verify token was consumed
    const tokenRecord = await repository.getInvitationToken(token);
    expect(tokenRecord?.isConsumed).toBe(true);
    expect(tokenRecord?.consumedAtUtc).toBeDefined();
  });

  it("rejects when token is already consumed", async () => {
    const token = await createTestInvite();
    await repository.consumeInvitationToken(token);

    const result = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
      },
      { repository, now: () => mockNow },
    );

    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("consumed");
  });

  it("rejects when token is expired", async () => {
    const token = await createTestInvite();
    const futureDate = new Date("2026-11-21T00:00:00.000Z");

    const result = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
      },
      { repository, now: () => futureDate },
    );

    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("expired");
  });

  it("rejects non-existent token with not_found", async () => {
    const result = await processSelfRegistration(
      "does-not-exist",
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
      },
      { repository, now: () => mockNow },
    );

    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("not_found");
  });

  it("validates visitor submission schema", async () => {
    const token = await createTestInvite();

    const result = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "",
        visitorGivenName: "",
      },
      { repository, now: () => mockNow },
    );

    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("validation");
    expect(result.error?.fieldErrors?.visitorFamilyName).toBeDefined();
    expect(result.error?.fieldErrors?.visitorGivenName).toBeDefined();
  });

  it("validates face photo size within 10-100 KB bounds", async () => {
    const token = await createTestInvite();

    // 2 KB is too small (< 10 KB)
    const tooSmall = createSampleFaceJpegDataUri(2 * 1024);
    const resultSmall = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
        facePhoto: tooSmall,
      },
      { repository, now: () => mockNow },
    );

    expect(resultSmall.ok).toBe(false);
    expect(resultSmall.error?.kind).toBe("validation");
    expect(resultSmall.error?.fieldErrors?.facePhoto).toContain("10 KB");

    // 120 KB is too large (> 100 KB)
    const tooLarge = createSampleFaceJpegDataUri(120 * 1024);
    const resultLarge = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
        facePhoto: tooLarge,
      },
      { repository, now: () => mockNow },
    );

    expect(resultLarge.ok).toBe(false);
    expect(resultLarge.error?.kind).toBe("validation");
    expect(resultLarge.error?.fieldErrors?.facePhoto).toContain("100 KB");
  });

  it("handles HikCentral upstream error gracefully without consuming token", async () => {
    const token = await createTestInvite();

    const mockFailingDispatcher = async () => {
      throw new HikCentralError(
        "Network connection to HikCentral failed.",
        {
          kind: "network",
          status: 502,
        },
      );
    };

    const result = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
      },
      {
        repository,
        appointmentDispatcher: mockFailingDispatcher,
        now: () => mockNow,
      },
    );

    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("upstream");

    // Verify token was NOT consumed, allowing retry
    const tokenRecord = await repository.getInvitationToken(token);
    expect(tokenRecord?.isConsumed).toBe(false);
  });

  it("escalates visit to SECURITY_ESCALATED when self-registration matches monitoring list", async () => {
    const token = await createTestInvite();

    const mockFlaggedDispatcher = async () => ({
      ...mockHikAppointmentSuccess,
      watchListInfo: [
        {
          ID: "wl-self-999",
          enableRegister: 0,
          type: "Deny Entry",
          remark: "Security Alert: Flagged individual on watchlist",
          identiFiyCode: "3171000000000001",
        },
      ],
    });

    const result = await processSelfRegistration(
      token,
      {
        visitorFamilyName: "Prasetyo",
        visitorGivenName: "Budi",
        certificateType: 111,
        certificateNo: "3171000000000001",
      },
      {
        repository,
        appointmentDispatcher: mockFlaggedDispatcher,
        now: () => mockNow,
      },
    );

    expect(result.ok).toBe(true);
    expect(result.visit?.status).toBe("SECURITY_ESCALATED");
    expect(result.visit?.monitoringListFlag?.isFlagged).toBe(true);
    expect(result.visit?.monitoringListFlag?.matches?.[0].certificateNo).toBe("3171000000000001");
  });
});
