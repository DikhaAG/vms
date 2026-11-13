import {
  type IVmsRepository,
  defaultVmsRepository,
} from "./repository";
import {
  validateCheckInInput,
  validateWalkInRegistrationInput,
  type CheckInPass,
} from "./checkin-contract";
import type {
  CredentialSyncStatus,
  Visit,
  VisitStatus,
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
  constructor(private readonly repository: IVmsRepository = defaultVmsRepository) {}

  /**
   * Fast lookup for visitors arriving at the front desk by name, phone, certificateNo, appointment code, or ID.
   */
  async searchArrivingVisitors(
    query: string,
    facilityId?: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]> {
    return this.repository.searchVisits(query, facilityId, status);
  }

  /**
   * Executes one-click check-in for an approved visitor booking.
   * Calls HikCentral registerment, updates visit status to CHECKED_IN,
   * updates the stored appointRecordId (which changes upon check-in!),
   * updates credential sync status, and issues the CheckInPass.
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

    // 3. Fetch facility for timezone and name
    const facility = await this.repository.getFacility(visit.facilityId);
    if (!facility) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${visit.facilityId}' not found.`,
          status: 404,
        },
      };
    }

    // 4. Resolve access levels
    let accessLevels: Array<{ id: string | number; name?: string }> | undefined;
    let accessLevelNames: string[] = [];
    if (visit.accessLevelIds && visit.accessLevelIds.length > 0) {
      const allLevels = await this.repository.listAccessLevels(visit.facilityId);
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

    // 6. Time formatting in facility timezone
    const nowUtc = new Date();
    const checkInTimeFacility = formatFacilityIso(nowUtc, facility.timezone);
    const checkOutTimeFacility = visit.scheduledEndTimeFacility;

    // 7. Invoke HikCentral check-in adapter (POST /artemis/api/visitor/v1/registerment)
    let hcResult;
    try {
      hcResult = await executeHikCentralCheckIn(
        {
          appointId: visit.hikCentral?.appointRecordId,
          hostId: visit.hostId || input.receptionistUserId,
          visitStartTime: checkInTimeFacility,
          visitEndTime: checkOutTimeFacility,
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
      // Non-fatal if status probe fails immediately; will default to Applied/Syncing
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

    const pass = this.buildCheckInPass(
      updatedVisit,
      facility.name,
      accessLevelNames,
    );

    return {
      ok: true,
      visit: updatedVisit,
      pass,
    };
  }

  /**
   * Registers and immediately checks in an unscheduled walk-in visitor arriving at reception.
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

    // 1. Fetch facility
    const facility = await this.repository.getFacility(input.facilityId);
    if (!facility) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          message: `Facility '${input.facilityId}' not found.`,
          status: 404,
        },
      };
    }

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

    // 3. Resolve schedule times
    const now = new Date();
    let startUtc: Date;
    let endUtc: Date;

    if (input.scheduledStartTime && input.scheduledEndTime) {
      try {
        startUtc = parseLocalDateTimeToUtc(
          input.scheduledStartTime,
          facility.timezone,
        );
        endUtc = parseLocalDateTimeToUtc(
          input.scheduledEndTime,
          facility.timezone,
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
      // Default: now until +4 hours
      startUtc = now;
      endUtc = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }

    const scheduledStartTimeUtc = startUtc.toISOString();
    const scheduledEndTimeUtc = endUtc.toISOString();
    const scheduledStartTimeFacility = formatFacilityIso(
      startUtc,
      facility.timezone,
    );
    const scheduledEndTimeFacility = formatFacilityIso(
      endUtc,
      facility.timezone,
    );

    // 4. Resolve access levels
    const allFacilityLevels = await this.repository.listAccessLevels(
      input.facilityId,
    );
    let resolvedAccessLevelIds = input.accessLevelIds;
    if (!resolvedAccessLevelIds || resolvedAccessLevelIds.length === 0) {
      const defaultLevel = allFacilityLevels.find((al) => al.isDefault);
      if (defaultLevel) {
        resolvedAccessLevelIds = [defaultLevel.id];
      }
    }

    const matchedLevels = allFacilityLevels.filter((al) =>
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
          visitStartTime: scheduledStartTimeFacility,
          visitEndTime: scheduledEndTimeFacility,
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

    // 8. Create visit record directly in CHECKED_IN status
    const visitId = `vis-walkin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const actualCheckInTimeUtc = now.toISOString();

    const newVisit: Visit = {
      id: visitId,
      facilityId: input.facilityId,
      facilityName: facility.name,
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
      scheduledStartTimeFacility,
      scheduledEndTimeFacility,
      actualCheckInTimeUtc,
      status: "CHECKED_IN",
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

    await this.repository.saveVisit(newVisit);

    // Save check-in audit event
    await this.repository.saveCheckInEvent({
      id: `chk-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId,
      checkedInAtUtc: actualCheckInTimeUtc,
      receptionistUserId: input.receptionistUserId,
      receptionistName: input.receptionistName,
      verificationMethod: input.verificationMethod ?? "id_card",
      notes: input.notes,
    });

    const pass = this.buildCheckInPass(
      newVisit,
      facility.name,
      accessLevelNames,
    );

    return {
      ok: true,
      visit: newVisit,
      pass,
    };
  }

  private buildCheckInPass(
    visit: Visit,
    facilityName?: string,
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
      facilityId: visit.facilityId,
      facilityName: facilityName ?? visit.facilityName,
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
