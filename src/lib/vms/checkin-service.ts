import type { PostgresVmsRepository } from "./postgres-repository";
import { defaultVmsRepository } from "./repository";
import { resolveFallbackTimezone } from "./system-settings-defaults";
import {
  validateCheckInInput,
  validateWalkInRegistrationInput,
  type CheckInPass,
} from "./checkin-contract";
import {
  type CredentialSyncStatus,
  type Visit,
  type VisitStatus,
} from "./vms-contract";
import { formatFacilityIso, parseLocalDateTimeToUtc } from "./timezone";
import { executeHikCentralCheckIn } from "./hikcentral-checkin-adapter";
import { getCredentialSyncStatus } from "./hikcentral-face-adapter";
import { normalizeFaceImage } from "./face-normalizer";
import { HikCentralError } from "../hikcentral/client";

export type CheckInErrorKind =
  | "validation"
  | "not_found"
  | "invalid_state"
  | "config"
  | "network"
  | "upstream";

export interface CheckInError {
  kind: CheckInErrorKind;
  message: string;
  fieldErrors?: Record<string, string>;
  status?: number;
  code?: string;
}

export interface CheckInResult {
  ok: boolean;
  visit?: Visit;
  pass?: CheckInPass;
  error?: CheckInError;
}

export class CheckInService {
  constructor(
    private readonly repository: PostgresVmsRepository = defaultVmsRepository,
  ) { }

  /**
   * Global lookup for arriving and active visitors across the entire site.
   */
  async searchArrivingVisitors(
    query: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]> {
    return this.repository.searchVisits(query, status);
  }

  /**
   * Executes one-click check-in for an approved visitor booking across the single site.
   */
  async performCheckIn(
    visitId: string,
    rawInput: unknown,
  ): Promise<CheckInResult> {
    const validation = validateCheckInInput(rawInput);
    if (!validation.valid) {
      return {
        ok: false,
        error: {
          kind: "validation",
          message: "Check-in input validation failed.",
          fieldErrors: validation.errors,
          status: 400,
        },
      };
    }

    const input = validation.input;

    // 1. Fetch visit
    const visit = await this.repository.getVisit(visitId);
    if (!visit) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          message: `Visit '${visitId}' not found.`,
          status: 404,
        },
      };
    }

    // 2. Validate state: only APPROVED visits can be checked in
    if (visit.status !== "APPROVED") {
      return {
        ok: false,
        error: {
          kind: "invalid_state",
          message: `Only approved visits can be checked in. Current status: ${visit.status}.`,
          status: 409,
        },
      };
    }

    // 3. Load global system settings for canonical timezone
    const settings = await this.repository.getSettings();
    const systemTimezone =
      settings.timezone || resolveFallbackTimezone();

    // 4. Resolve building-wide access levels without facility boundaries
    let accessLevels: Array<{ id: string | number; name?: string }> | undefined;
    let accessLevelNames: string[] = [];
    if (visit.accessLevelIds && visit.accessLevelIds.length > 0) {
      const allLevels = await this.repository.listAccessLevels();
      const matched = allLevels.filter((al) =>
        visit.accessLevelIds?.includes(al.id),
      );
      if (matched.length > 0) {
        accessLevels = matched.map((al) => ({ id: al.id, name: al.name }));
        accessLevelNames = matched.map((al) => al.name);
      }
    }

    // 5. Determine QR valid num from tap quota
    let qrCodeValidNum = 0;
    if (
      visit.tapQuota?.mode === "limited" &&
      typeof visit.tapQuota.maxTaps === "number" &&
      visit.tapQuota.maxTaps > 0
    ) {
      qrCodeValidNum = visit.tapQuota.maxTaps;
    }

    // 6. Time formatting in global system timezone
    const nowUtc = new Date();
    const checkInTimeLocal = formatFacilityIso(nowUtc, systemTimezone);
    const checkOutTimeLocal =
      visit.scheduledEndTimeFacility ||
      formatFacilityIso(visit.scheduledEndTimeUtc, systemTimezone);

    // 7. Invoke HikCentral check-in adapter (POST /artemis/api/visitor/v1/registerment)
    let hcResult;
    try {
      hcResult = await executeHikCentralCheckIn(
        {
          appointId: visit.hikCentral?.appointRecordId,
          hostId: visit.hostId || input.receptionistUserId,
          visitStartTime: checkInTimeLocal,
          visitEndTime: checkOutTimeLocal,
          visitPurposeType: visit.visitReasonType,
          visitPurpose: visit.visitReasonDetail,
          visitorFamilyName: visit.visitorFamilyName,
          visitorGivenName: visit.visitorGivenName,
          phoneNo: visit.visitorPhone,
          email: visit.visitorEmail,
          certificateType: visit.certificateType,
          certificateNo: visit.certificateNo,
          qrCodeValidNum,
          accessLevels,
          facePhotoData: visit.facePhoto,
        },
        {
          mode: input.mode,
          stubScenario: input.stubScenario,
        },
      );
    } catch (err) {
      if (err instanceof HikCentralError) {
        return {
          ok: false,
          error: {
            kind: err.kind === "network" ? "network" : "upstream",
            message: err.message,
            code: err.code,
            status: err.status || 502,
          },
        };
      }
      return {
        ok: false,
        error: {
          kind: "upstream",
          message:
            err instanceof Error
              ? err.message
              : "HikCentral check-in registration failed.",
          status: 502,
        },
      };
    }

    // 8. Update visit in repository
    const actualCheckInTimeUtc =
      input.actualCheckInTimeUtc || nowUtc.toISOString();

    let credentialSyncStatus: CredentialSyncStatus = "Applied";
    try {
      const syncReport = await getCredentialSyncStatus(
        { visitorId: hcResult.visitorId },
        { mode: input.mode, stubScenario: input.stubScenario },
      );
      credentialSyncStatus = syncReport.overallStatus;
    } catch {
      // Non-fatal fallback
    }

    const updatedVisit = await this.repository.checkInVisit(visitId, {
      actualCheckInTimeUtc,
      receptionistUserId: input.receptionistUserId,
      receptionistName: input.receptionistName,
      verificationMethod: input.verificationMethod ?? "manual",
      notes: input.notes,
      hikCentral: {
        appointRecordId: hcResult.appointRecordId,
        visitorId: hcResult.visitorId,
        appointCode: visit.hikCentral?.appointCode,
        qrCodeImage: hcResult.qrCodeImage ?? visit.hikCentral?.qrCodeImage,
        pinCode: hcResult.pinCode,
      },
      credentialSyncStatus,
    });

    const pass = this.buildCheckInPass(updatedVisit, accessLevelNames);

    return {
      ok: true,
      visit: updatedVisit,
      pass,
    };
  }

  /**
   * Registers and immediately checks in an unscheduled walk-in visitor directly to the single site.
   */
  async createWalkInVisit(rawInput: unknown): Promise<CheckInResult> {
    const validation = validateWalkInRegistrationInput(rawInput);
    if (!validation.valid) {
      return {
        ok: false,
        error: {
          kind: "validation",
          message: "Walk-in registration input validation failed.",
          fieldErrors: validation.errors,
          status: 400,
        },
      };
    }

    const input = validation.input;

    // 1. Load global system settings
    const settings = await this.repository.getSettings();
    const systemTimezone =
      settings.timezone || resolveFallbackTimezone();

    // 2. Normalization of face photo if supplied
    let normalizedFacePhoto: string | undefined;
    if (input.facePhoto) {
      try {
        const normResult = await normalizeFaceImage(input.facePhoto);
        normalizedFacePhoto = normResult.dataUri;
      } catch (err) {
        return {
          ok: false,
          error: {
            kind: "validation",
            message: `Face photo validation failed: ${err instanceof Error ? err.message : String(err)}`,
            status: 400,
          },
        };
      }
    }

    // 3. Resolve schedule times in global system timezone
    const now = new Date();
    let startUtc: Date;
    let endUtc: Date;

    if (input.scheduledStartTime && input.scheduledEndTime) {
      try {
        startUtc = parseLocalDateTimeToUtc(
          input.scheduledStartTime,
          systemTimezone,
        );
        endUtc = parseLocalDateTimeToUtc(
          input.scheduledEndTime,
          systemTimezone,
        );
      } catch (err) {
        return {
          ok: false,
          error: {
            kind: "validation",
            message:
              err instanceof Error
                ? err.message
                : "Invalid scheduled time format.",
            status: 400,
          },
        };
      }
    } else {
      startUtc = now;
      endUtc = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }

    const scheduledStartTimeUtc = startUtc.toISOString();
    const scheduledEndTimeUtc = endUtc.toISOString();
    const scheduledStartTimeLocal = formatFacilityIso(startUtc, systemTimezone);
    const scheduledEndTimeLocal = formatFacilityIso(endUtc, systemTimezone);

    // 4. Resolve building-wide access levels without facility boundaries
    const allLevels = await this.repository.listAccessLevels();
    let resolvedAccessLevelIds = input.accessLevelIds;
    if (!resolvedAccessLevelIds || resolvedAccessLevelIds.length === 0) {
      const defaults = allLevels.filter((al) => al.isDefault);
      if (defaults.length > 0) {
        resolvedAccessLevelIds = defaults.map((al) => al.id);
      }
    }

    const matchedLevels = allLevels.filter((al) =>
      resolvedAccessLevelIds?.includes(al.id),
    );
    const accessLevels =
      matchedLevels.length > 0
        ? matchedLevels.map((al) => ({ id: al.id, name: al.name }))
        : undefined;
    const accessLevelNames = matchedLevels.map((al) => al.name);

    // 5. Tap quota
    let qrCodeValidNum = 0;
    if (
      input.tapQuota?.mode === "limited" &&
      typeof input.tapQuota.maxTaps === "number" &&
      input.tapQuota.maxTaps > 0
    ) {
      qrCodeValidNum = input.tapQuota.maxTaps;
    }

    // 6. Execute HikCentral registerment without appointId
    let hcResult;
    try {
      hcResult = await executeHikCentralCheckIn(
        {
          hostId: input.hostId || input.receptionistUserId,
          visitStartTime: scheduledStartTimeLocal,
          visitEndTime: scheduledEndTimeLocal,
          visitPurposeType: input.visitReasonType,
          visitPurpose: input.visitReasonDetail,
          visitorFamilyName: input.visitorFamilyName,
          visitorGivenName: input.visitorGivenName,
          phoneNo: input.visitorPhone,
          email: input.visitorEmail,
          certificateType: input.certificateType,
          certificateNo: input.certificateNo,
          qrCodeValidNum,
          accessLevels,
          facePhotoData: normalizedFacePhoto,
        },
        {
          mode: input.mode,
          stubScenario: input.stubScenario,
        },
      );
    } catch (err) {
      if (err instanceof HikCentralError) {
        return {
          ok: false,
          error: {
            kind: err.kind === "network" ? "network" : "upstream",
            message: err.message,
            code: err.code,
            status: err.status || 502,
          },
        };
      }
      return {
        ok: false,
        error: {
          kind: "upstream",
          message:
            err instanceof Error
              ? err.message
              : "HikCentral check-in registration failed.",
          status: 502,
        },
      };
    }

    // 7. Check credential sync status
    let credentialSyncStatus: CredentialSyncStatus = "Applied";
    try {
      const syncReport = await getCredentialSyncStatus(
        { visitorId: hcResult.visitorId },
        { mode: input.mode, stubScenario: input.stubScenario },
      );
      credentialSyncStatus = syncReport.overallStatus;
    } catch {
      // Non-fatal fallback
    }

    // 8. Create the CHECKED_IN Visit and its check-in audit event together
    const actualCheckInTimeUtc = now.toISOString();

    const walkInVisit: Omit<Visit, "status" | "actualCheckInTimeUtc"> = {
      id: `vis-walkin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      hostId: input.hostId,
      hostName: input.hostName,
      visitorFamilyName: input.visitorFamilyName,
      visitorGivenName: input.visitorGivenName,
      visitorPhone: input.visitorPhone,
      visitorEmail: input.visitorEmail,
      certificateType: input.certificateType,
      certificateNo: input.certificateNo,
      visitReasonType: input.visitReasonType,
      visitReasonDetail: input.visitReasonDetail,
      scheduledStartTimeUtc,
      scheduledEndTimeUtc,
      scheduledStartTimeFacility: scheduledStartTimeLocal,
      scheduledEndTimeFacility: scheduledEndTimeLocal,
      facePhoto: normalizedFacePhoto,
      credentialSyncStatus,
      hikCentral: {
        appointRecordId: hcResult.appointRecordId,
        visitorId: hcResult.visitorId,
        qrCodeImage: hcResult.qrCodeImage,
        pinCode: hcResult.pinCode,
      },
      accessLevelIds: resolvedAccessLevelIds,
      tapQuota: input.tapQuota,
      createdAtUtc: actualCheckInTimeUtc,
      updatedAtUtc: actualCheckInTimeUtc,
    };

    const newVisit = await this.repository.checkInWalkIn(walkInVisit, {
      actualCheckInTimeUtc,
      receptionistUserId: input.receptionistUserId,
      receptionistName: input.receptionistName,
      verificationMethod: input.verificationMethod,
      notes: input.notes,
    });

    const pass = this.buildCheckInPass(newVisit, accessLevelNames);

    return {
      ok: true,
      visit: newVisit,
      pass,
    };
  }

  private buildCheckInPass(
    visit: Visit,
    accessLevelNames?: string[],
  ): CheckInPass {
    return {
      visitId: visit.id,
      visitorName: `${visit.visitorGivenName} ${visit.visitorFamilyName}`,
      visitorFamilyName: visit.visitorFamilyName,
      visitorGivenName: visit.visitorGivenName,
      visitorPhone: visit.visitorPhone,
      visitorEmail: visit.visitorEmail,
      certificateNo: visit.certificateNo,
      hostId: visit.hostId,
      hostName: visit.hostName,
      scheduledStartTime: visit.scheduledStartTimeFacility,
      scheduledEndTime: visit.scheduledEndTimeFacility,
      actualCheckInTimeUtc:
        visit.actualCheckInTimeUtc ?? new Date().toISOString(),
      qrCodeImage: visit.hikCentral?.qrCodeImage,
      pinCode: visit.hikCentral?.pinCode,
      appointRecordId: visit.hikCentral?.appointRecordId ?? "",
      visitorId: visit.hikCentral?.visitorId ?? "",
      credentialSyncStatus: visit.credentialSyncStatus ?? "Unknown",
      accessLevelNames,
    };
  }
}

export const defaultCheckInService = new CheckInService();