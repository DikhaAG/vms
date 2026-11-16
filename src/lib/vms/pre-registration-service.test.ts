import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryVmsRepository, TEST_FIXTURE_ACCESS_LEVELS } from "./repository";
import {
  cancelVisit,
  createPreRegistration,
} from "./pre-registration-service";
import {
  createSampleFaceJpegDataUri,
  stripDataUriPrefix,
} from "./face-normalizer";
import type { CreatePreRegistrationInput } from "./vms-contract";
import type {
  HikCentralAppointmentParams,
  HikCentralAppointmentSuccess,
} from "./hikcentral-appointment-adapter";

describe("createPreRegistration", () => {
  let repo: InMemoryVmsRepository;

  beforeEach(async () => {
    repo = new InMemoryVmsRepository();
    await repo.saveAccessLevels(TEST_FIXTURE_ACCESS_LEVELS);
  });

  const baseInput: CreatePreRegistrationInput = {
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
    expect(visit.visitorFamilyName).toBe("Pratama");
    expect(visit.visitorGivenName).toBe("Rian");

    // UTC normalized times
    // 2026-11-13 10:00 in Asia/Jakarta (UTC+7) -> 03:00 UTC
    expect(visit.scheduledStartTimeUtc).toBe("2026-11-13T03:00:00.000Z");
    expect(visit.scheduledEndTimeUtc).toBe("2026-11-13T05:00:00.000Z");

    // Local formatted times
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

  it("correctly handles global system timezone (e.g. Asia/Makassar)", async () => {
    await repo.updateSettings({ timezone: "Asia/Makassar" });

    const result = await createPreRegistration(
      {
        ...baseInput,
        scheduledStartTime: "2026-11-13T10:00:00",
        scheduledEndTime: "2026-11-13T12:00:00",
      },
      { repository: repo },
    );
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

  it("ignores legacy or omitted facilityId under single-site architecture", async () => {
    const legacyFacilityInput = {
      ...baseInput,
      facilityId: "legacy-or-omitted-facility",
    };

    const result = await createPreRegistration(legacyFacilityInput, {
      repository: repo,
    });
    expect(result.ok).toBe(true);
    expect(result.visit).toBeDefined();
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

    const faceDataUri = createSampleFaceJpegDataUri();
    const inputWithFace: CreatePreRegistrationInput = {
      ...baseInput,
      facePhoto: faceDataUri,
    };

    const result = await createPreRegistration(inputWithFace, {
      repository: repo,
      appointmentDispatcher: mockDispatcher,
    });

    expect(result.ok).toBe(true);
    expect(dispatchedParams?.facePhotoData).toBe(stripDataUriPrefix(faceDataUri));
    expect(result.visit?.facePhoto).toBe(faceDataUri);
    expect(result.visit?.credentialSyncStatus).toBe("Applied");
  });

  it("passes accessLevels and tapQuota to dispatcher and persists them on Visit", async () => {
    let dispatchedParams: HikCentralAppointmentParams | undefined;
    const mockDispatcher = async (
      params: HikCentralAppointmentParams,
    ): Promise<HikCentralAppointmentSuccess> => {
      dispatchedParams = params;
      return {
        appointRecordId: "mock-rec-acc-1",
        visitorId: "mock-vis-acc-1",
      };
    };

    const inputWithAccessAndQuota: CreatePreRegistrationInput = {
      ...baseInput,
      accessLevelIds: ["acc-jkt-lobby", "acc-jkt-exec"],
      tapQuota: {
        mode: "limited",
        maxTaps: 4,
      },
    };

    const result = await createPreRegistration(inputWithAccessAndQuota, {
      repository: repo,
      appointmentDispatcher: mockDispatcher,
    });

    expect(result.ok).toBe(true);
    expect(result.visit?.accessLevelIds).toEqual([
      "acc-jkt-lobby",
      "acc-jkt-exec",
    ]);
    expect(result.visit?.tapQuota).toEqual({
      mode: "limited",
      maxTaps: 4,
    });

    // Check dispatched params
    expect(dispatchedParams?.accessLevels).toEqual([
      { id: "acc-jkt-lobby", name: "Lobby & 1st Floor Turnstiles" },
      { id: "acc-jkt-exec", name: "Executive Floor 3" },
    ]);
    expect(dispatchedParams?.qrCodeValidNum).toBe(4);
  });

  it("automatically assigns default building access levels when accessLevelIds is omitted", async () => {
    let dispatchedParams: HikCentralAppointmentParams | undefined;
    const mockDispatcher = async (
      params: HikCentralAppointmentParams,
    ): Promise<HikCentralAppointmentSuccess> => {
      dispatchedParams = params;
      return {
        appointRecordId: "mock-rec-def-1",
        visitorId: "mock-vis-def-1",
      };
    };

    const inputWithoutFacilityOrAccess = { ...baseInput };
    delete (inputWithoutFacilityOrAccess as Record<string, unknown>).facilityId;
    delete (inputWithoutFacilityOrAccess as Record<string, unknown>).accessLevelIds;

    const result = await createPreRegistration(inputWithoutFacilityOrAccess, {
      repository: repo,
      appointmentDispatcher: mockDispatcher,
    });

    expect(result.ok).toBe(true);
    expect(result.visit?.accessLevelIds).toEqual([
      "acc-jkt-lobby",
      "acc-bali-main",
      "acc-jay-warehouse",
    ]);
    expect(dispatchedParams?.accessLevels).toEqual([
      { id: "acc-jkt-lobby", name: "Lobby & 1st Floor Turnstiles" },
      { id: "acc-bali-main", name: "Innovation Hub General Access" },
      { id: "acc-jay-warehouse", name: "Logistics Hub & Warehouse" },
    ]);
  });

  describe("cancelVisit", () => {
    it("cancels a pending visit and invokes appointment delete", async () => {
      const created = await createPreRegistration(baseInput, { repository: repo });
      expect(created.ok).toBe(true);
      const visitId = created.visit!.id;

      const mockDeleter = vi.fn().mockResolvedValue({
        appointRecordId: "mock-appoint-rec-1",
        code: "0",
        msg: "Success",
      });

      const cancelRes = await cancelVisit(visitId, "Guest meeting rescheduled", {
        repository: repo,
        appointmentDeleter: mockDeleter,
      });

      expect(cancelRes.ok).toBe(true);
      expect(cancelRes.visit?.status).toBe("CANCELLED");
      expect(cancelRes.visit?.remark).toMatch(/Cancel reason: Guest meeting rescheduled/i);
      expect(mockDeleter).toHaveBeenCalledWith(
        created.visit!.hikCentral!.appointRecordId,
        expect.anything(),
      );

      const stored = await repo.getVisit(visitId);
      expect(stored?.status).toBe("CANCELLED");
    });

    it("returns 404 when visitId does not exist", async () => {
      const cancelRes = await cancelVisit("nonexistent-visit", undefined, {
        repository: repo,
      });
      expect(cancelRes.ok).toBe(false);
      expect(cancelRes.error?.kind).toBe("not_found");
      expect(cancelRes.error?.status).toBe(404);
    });

    it("rejects cancellation if visit is already cancelled", async () => {
      const created = await createPreRegistration(baseInput, { repository: repo });
      const firstCancel = await cancelVisit(created.visit!.id, "First cancel", {
        repository: repo,
        mode: "stub",
      });
      expect(firstCancel.ok).toBe(true);

      const secondCancel = await cancelVisit(created.visit!.id, "Second cancel", {
        repository: repo,
        mode: "stub",
      });
      expect(secondCancel.ok).toBe(false);
      expect(secondCancel.error?.kind).toBe("invalid_state");
      expect(secondCancel.error?.message).toMatch(/already cancelled/i);
    });

    it("rejects cancellation if visit is already checked in", async () => {
      const created = await createPreRegistration(baseInput, { repository: repo });
      await repo.updateVisit(created.visit!.id, { status: "CHECKED_IN" });

      const res = await cancelVisit(created.visit!.id, "Late cancel", {
        repository: repo,
      });
      expect(res.ok).toBe(false);
      expect(res.error?.kind).toBe("invalid_state");
      expect(res.error?.message).toMatch(/Cannot cancel visit in status 'CHECKED_IN'/i);
    });
  });
});