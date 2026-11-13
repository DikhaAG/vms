import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository } from "./repository";
import { createPreRegistration } from "./pre-registration-service";
import type { CreatePreRegistrationInput } from "./vms-contract";
import type {
  HikCentralAppointmentParams,
  HikCentralAppointmentSuccess,
} from "./hikcentral-appointment-adapter";

describe("createPreRegistration", () => {
  let repo: InMemoryVmsRepository;

  beforeEach(() => {
    repo = new InMemoryVmsRepository();
  });

  const baseInput: CreatePreRegistrationInput = {
    facilityId: "fac-jakarta",
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitorFamilyName: "Pratama",
    visitorGivenName: "Rian",
    visitorPhone: "+628123456789",
    visitorEmail: "rian@example.com",
    certificateType: 111,
    certificateNo: "3171012345670001",
    visitReasonType: 3, // Meeting
    scheduledStartTime: "2026-11-13T10:00:00",
    scheduledEndTime: "2026-11-13T12:00:00",
    mode: "stub",
    stubScenario: "success",
  };

  it("successfully creates pre-registration with status PENDING_APPROVAL and HikCentral reference", async () => {
    const result = await createPreRegistration(baseInput, { repository: repo });

    expect(result.ok).toBe(true);
    expect(result.visit).toBeDefined();

    const visit = result.visit!;
    expect(visit.status).toBe("PENDING_APPROVAL");
    expect(visit.facilityId).toBe("fac-jakarta");
    expect(visit.facilityName).toBe("Jakarta Corporate HQ");
    expect(visit.visitorFamilyName).toBe("Pratama");
    expect(visit.visitorGivenName).toBe("Rian");

    // UTC normalized times
    // 2026-11-13 10:00 in Asia/Jakarta (UTC+7) -> 03:00 UTC
    expect(visit.scheduledStartTimeUtc).toBe("2026-11-13T03:00:00.000Z");
    expect(visit.scheduledEndTimeUtc).toBe("2026-11-13T05:00:00.000Z");

    // Facility formatted times
    expect(visit.scheduledStartTimeFacility).toBe("2026-11-13T10:00:00+07:00");
    expect(visit.scheduledEndTimeFacility).toBe("2026-11-13T12:00:00+07:00");

    // HikCentral references
    expect(visit.hikCentral?.appointRecordId).toMatch(/^apt-rec-/);
    expect(visit.hikCentral?.visitorId).toMatch(/^vis-/);
    expect(visit.hikCentral?.qrCodeImage).toBeDefined();

    // Persisted in repository
    const stored = await repo.getVisit(visit.id);
    expect(stored).toEqual(visit);
  });

  it("escalates visit status to SECURITY_ESCALATED when monitoring list matches", async () => {
    const flaggedInput: CreatePreRegistrationInput = {
      ...baseInput,
      stubScenario: "monitoring-list-flagged",
    };

    const result = await createPreRegistration(flaggedInput, { repository: repo });

    expect(result.ok).toBe(true);
    expect(result.visit).toBeDefined();

    const visit = result.visit!;
    expect(visit.status).toBe("SECURITY_ESCALATED");
    expect(visit.monitoringListFlag).toBeDefined();
    expect(visit.monitoringListFlag?.isFlagged).toBe(true);
    expect(visit.monitoringListFlag?.matches).toHaveLength(1);
    expect(visit.monitoringListFlag?.matches?.[0].certificateNo).toBe("3171012345670001");
  });

  it("correctly handles different facility timezones (e.g. Asia/Makassar for Bali)", async () => {
    const baliInput: CreatePreRegistrationInput = {
      ...baseInput,
      facilityId: "fac-bali",
      scheduledStartTime: "2026-11-13T10:00:00",
      scheduledEndTime: "2026-11-13T12:00:00",
    };

    const result = await createPreRegistration(baliInput, { repository: repo });
    expect(result.ok).toBe(true);
    const visit = result.visit!;

    // Asia/Makassar is UTC+8: 10:00 WITA -> 02:00 UTC
    expect(visit.scheduledStartTimeUtc).toBe("2026-11-13T02:00:00.000Z");
    expect(visit.scheduledEndTimeUtc).toBe("2026-11-13T04:00:00.000Z");
    expect(visit.scheduledStartTimeFacility).toBe("2026-11-13T10:00:00+08:00");
    expect(visit.scheduledEndTimeFacility).toBe("2026-11-13T12:00:00+08:00");
  });

  it("returns validation error when required fields are missing", async () => {
    const invalidInput = {
      ...baseInput,
      visitorFamilyName: "",
    };

    const result = await createPreRegistration(invalidInput, { repository: repo });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("validation");
    expect(result.error?.fieldErrors?.visitorFamilyName).toBeDefined();
  });

  it("returns not_found error when facility does not exist", async () => {
    const unknownFacilityInput = {
      ...baseInput,
      facilityId: "non-existent-facility",
    };

    const result = await createPreRegistration(unknownFacilityInput, {
      repository: repo,
    });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("not_found");
    expect(result.error?.message).toContain("non-existent-facility");
  });

  it("handles upstream HikCentral errors cleanly without crashing", async () => {
    const authErrorInput: CreatePreRegistrationInput = {
      ...baseInput,
      mode: "stub",
      stubScenario: "auth-error",
    };

    const result = await createPreRegistration(authErrorInput, {
      repository: repo,
    });
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe("upstream");
    expect(result.error?.message).toContain("appKey");

    // Ensure no orphan visit was saved
    const visits = await repo.listVisits();
    expect(visits).toHaveLength(0);
  });

  it("supports custom mock appointment dispatcher", async () => {
    let dispatchedParams: HikCentralAppointmentParams | undefined;
    const mockDispatcher = async (
      params: HikCentralAppointmentParams,
    ): Promise<HikCentralAppointmentSuccess> => {
      dispatchedParams = params;
      return {
        appointRecordId: "mock-rec-777",
        visitorId: "mock-vis-777",
        appointCode: "7777",
        qrCodeImage: "mockQrImageBase64",
      };
    };

    const result = await createPreRegistration(baseInput, {
      repository: repo,
      appointmentDispatcher: mockDispatcher,
    });

    expect(result.ok).toBe(true);
    expect(result.visit?.hikCentral?.appointRecordId).toBe("mock-rec-777");
    expect(dispatchedParams).toBeDefined();
  });

  it("passes facePhotoData to dispatcher and stores normalized facePhoto and sync status in Visit", async () => {
    let dispatchedParams: HikCentralAppointmentParams | undefined;
    const mockDispatcher = async (
      params: HikCentralAppointmentParams,
    ): Promise<HikCentralAppointmentSuccess> => {
      dispatchedParams = params;
      return {
        appointRecordId: "mock-rec-face-1",
        visitorId: "mock-vis-face-1",
      };
    };

    const faceDataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/";
    const inputWithFace: CreatePreRegistrationInput = {
      ...baseInput,
      facePhoto: faceDataUri,
    };

    const result = await createPreRegistration(inputWithFace, {
      repository: repo,
      appointmentDispatcher: mockDispatcher,
    });

    expect(result.ok).toBe(true);
    expect(dispatchedParams?.facePhotoData).toBe(faceDataUri);
    expect(result.visit?.facePhoto).toBe(faceDataUri);
    expect(result.visit?.credentialSyncStatus).toBe("Applied");
  });
});
