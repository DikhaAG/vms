import {
  evaluateOverstayStatus,
  isTapQuotaExceeded,
  type ActiveVisitSummary,
  type CheckOutInput,
  type DoorTapEvent,
} from "./checkout-contract";
import {
  executeHikCentralCheckOut,
  type CheckOutAdapterOptions,
} from "./hikcentral-checkout-adapter";
import {
  defaultVmsRepository,
  type IVmsRepository,
} from "./repository";
import { VISIT_REASON_LABELS, type Visit } from "./vms-contract";

export interface TapEnforcementResult {
  event: DoorTapEvent;
  visit: Visit;
  tapCount: number;
  remainingTaps?: number;
  isQuotaExceeded: boolean;
  autoCheckedOut: boolean;
}

export interface CheckOutResult {
  ok: boolean;
  visit?: Visit;
  error?: string;
}

export class ActiveMonitoringService {
  constructor(private readonly repository: IVmsRepository) {}

  /**
   * Retrieves all currently active on-premise visitors, enriched with
   * overstay calculations (against facility grace period) and tap quota metrics.
   */
  async getActiveVisits(
    facilityId?: string,
    nowUtc?: string | Date,
  ): Promise<ActiveVisitSummary[]> {
    const activeVisits = await this.repository.listActiveVisits(facilityId);
    const facilities = await this.repository.listFacilities();
    const facilityMap = new Map(facilities.map((f) => [f.id, f]));

    const summaries: ActiveVisitSummary[] = [];

    for (const visit of activeVisits) {
      const facility = facilityMap.get(visit.facilityId);
      const overstay = evaluateOverstayStatus(visit, facility, nowUtc);

      // State machine enforcement: transition CHECKED_IN -> OVERSTAY upon exceeding cutoff
      if (overstay.isOverstay && visit.status === "CHECKED_IN") {
        await this.repository.updateVisit(visit.id, {
          status: "OVERSTAY",
        });
        visit.status = "OVERSTAY";
      }

      const quotaExceeded = isTapQuotaExceeded(
        visit.tapCount ?? 0,
        visit.tapQuota,
      );

      const fullName = `${visit.visitorGivenName} ${visit.visitorFamilyName}`.trim();
      const maxTaps =
        visit.tapQuota?.mode === "limited"
          ? (visit.tapQuota.maxTaps ?? 0)
          : 0;

      summaries.push({
        visitId: visit.id,
        groupId: visit.groupId,
        visitorGroupName: visit.visitorGroupName,
        visitor: {
          givenName: visit.visitorGivenName,
          familyName: visit.visitorFamilyName,
          fullName,
          phone: visit.visitorPhone,
          email: visit.visitorEmail,
          certificateNo: visit.certificateNo,
          photo: visit.facePhoto,
        },
        host: visit.hostName
          ? {
              id: visit.hostId,
              name: visit.hostName,
            }
          : undefined,
        facility: {
          id: facility?.id ?? visit.facilityId,
          name: facility?.name ?? visit.facilityName ?? "Facility",
          timezone: facility?.timezone ?? "Asia/Jakarta",
        },
        visitReason: VISIT_REASON_LABELS[visit.visitReasonType] ?? "Visit",
        checkInTimeUtc:
          visit.actualCheckInTimeUtc ?? visit.scheduledStartTimeUtc,
        scheduledStartTimeUtc: visit.scheduledStartTimeUtc,
        scheduledEndTimeUtc: visit.scheduledEndTimeUtc,
        tapCount: visit.tapCount ?? 0,
        maxTaps,
        tapQuotaMode: visit.tapQuota?.mode ?? "unlimited",
        isQuotaExceeded: quotaExceeded,
        isOverstay: overstay.isOverstay,
        overstayMinutes: overstay.overstayMinutes,
        status: visit.status,
        appointRecordId: visit.hikCentral?.appointRecordId,
        accessLevelIds: visit.accessLevelIds,
        lastSeenDoor: visit.lastSeenDoor,
      });
    }

    return summaries;
  }

  /**
   * Records a door entry/exit tap event and verifies tap quota limits.
   * If the visitor reaches or exceeds their allotted quota, immediately
   * triggers automated checkout and revokes hardware terminal access!
   */
  async recordTapAndEnforceQuota(
    visitId: string,
    tapData: DoorTapEvent,
    options: CheckOutAdapterOptions = {},
  ): Promise<TapEnforcementResult> {
    const visit = await this.repository.getVisit(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    if (visit.status !== "CHECKED_IN" && visit.status !== "OVERSTAY") {
      throw new Error(
        `Cannot record tap: Visit ${visitId} is in status '${visit.status}' (must be 'CHECKED_IN' or 'OVERSTAY').`,
      );
    }

    // Lookup door topology metadata
    const door =
      (await this.repository.findDoor(tapData.doorIndexCode, visit.facilityId)) ||
      (tapData.doorName
        ? await this.repository.getDoorByName(tapData.doorName, visit.facilityId)
        : undefined) ||
      (await this.repository.findDoor(tapData.doorIndexCode));

    // Door directionality validation: SINGLE_DIRECTION_IN doors have no exit reader
    const isImplicit = Boolean(tapData.isImplicit || tapData.implicit);
    if (
      door &&
      door.accessType === "SINGLE_DIRECTION_IN" &&
      tapData.direction === "out" &&
      !isImplicit
    ) {
      throw new Error(
        `Door ${door.doorName || door.doorIndexCode} is configured as SINGLE_DIRECTION_IN and does not allow manual exit taps.`,
      );
    }

    const enrichedTapData: DoorTapEvent = {
      ...tapData,
      doorName: tapData.doorName ?? door?.doorName,
      isPerimeter: tapData.isPerimeter ?? door?.isPerimeter ?? false,
      inAndOutType:
        tapData.inAndOutType ?? (tapData.direction === "in" ? 1 : 2),
    };

    // Implicit room transition:
    // If visitor's last seen location was a SINGLE_DIRECTION_IN door and they now scan
    // into a different room, log an implicit departure breadcrumb from the previous door.
    if (
      visit.lastSeenDoor &&
      visit.lastSeenDoor.doorIndexCode !== enrichedTapData.doorIndexCode &&
      visit.lastSeenDoor.direction === "in"
    ) {
      const prevDoor =
        (await this.repository.findDoor(visit.lastSeenDoor.doorIndexCode, visit.facilityId)) ||
        (visit.lastSeenDoor.doorName
          ? await this.repository.getDoorByName(visit.lastSeenDoor.doorName, visit.facilityId)
          : undefined) ||
        (await this.repository.findDoor(visit.lastSeenDoor.doorIndexCode));

      const isPrevSingleDirection =
        visit.lastSeenDoor.accessType === "SINGLE_DIRECTION_IN" ||
        prevDoor?.accessType === "SINGLE_DIRECTION_IN";

      if (isPrevSingleDirection) {
        const prevDoorName =
          visit.lastSeenDoor.doorName || prevDoor?.doorName || visit.lastSeenDoor.doorIndexCode;
        const currentDoorName =
          enrichedTapData.doorName || enrichedTapData.doorIndexCode;

        const implicitExitEvent: DoorTapEvent = {
          visitId,
          doorIndexCode: visit.lastSeenDoor.doorIndexCode,
          doorName: prevDoorName,
          direction: "out",
          inAndOutType: 2,
          isImplicit: true,
          implicit: true,
          isPerimeter: prevDoor?.isPerimeter ?? false,
          transitionNote: `Implicit departure from ${prevDoorName} upon entry to ${currentDoorName}`,
          tappedAtUtc: enrichedTapData.tappedAtUtc,
        };

        await this.repository.recordDoorTap(implicitExitEvent);
      }
    }

    const tapResult = await this.repository.recordDoorTap(enrichedTapData);
    const quotaExceeded = isTapQuotaExceeded(
      tapResult.tapCount,
      tapResult.visit.tapQuota,
    );

    let remainingTaps: number | undefined;
    if (tapResult.visit.tapQuota?.mode === "limited") {
      const max = tapResult.visit.tapQuota.maxTaps ?? 0;
      remainingTaps = Math.max(0, max - tapResult.tapCount);
    }

    if (quotaExceeded) {
      // Auto-trigger check-out to de-authorize hardware terminal access
      const autoCheckOutInput: CheckOutInput = {
        visitId,
        operatorUserId: "system-tap-quota-enforcer",
        operatorName: "Tap Quota Auto-Enforcer",
        reason: `Automatic check-out: Tap quota exhausted (${tapResult.tapCount}/${tapResult.visit.tapQuota?.maxTaps ?? 0} taps reached).`,
        isForced: false,
        checkOutTimeUtc: tapData.tappedAtUtc || new Date().toISOString(),
        mode: options.mode,
        stubScenario: options.stubScenario,
      };

      const checkOutRes = await this.performCheckOut(
        visitId,
        autoCheckOutInput,
        options,
      );

      return {
        event: tapResult.event,
        visit: checkOutRes.visit ?? tapResult.visit,
        tapCount: tapResult.tapCount,
        remainingTaps: 0,
        isQuotaExceeded: true,
        autoCheckedOut: true,
      };
    }

    return {
      event: tapResult.event,
      visit: tapResult.visit,
      tapCount: tapResult.tapCount,
      remainingTaps,
      isQuotaExceeded: false,
      autoCheckedOut: false,
    };
  }

  /**
   * Executes normal or forced check-out:
   * 1. If appointRecordId exists, triggers HikCentral POST /artemis/api/visitor/v1/visitor/out.
   * 2. Updates visit status to CHECKED_OUT and logs audit details.
   */
  async performCheckOut(
    visitId: string,
    input: CheckOutInput,
    options: CheckOutAdapterOptions = {},
  ): Promise<CheckOutResult> {
    const visit = await this.repository.getVisit(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    if (visit.status !== "CHECKED_IN" && visit.status !== "OVERSTAY") {
      throw new Error(
        `Visit ${visitId} is not currently checked in (status: ${visit.status}).`,
      );
    }

    const appointRecordId = visit.hikCentral?.appointRecordId;

    if (appointRecordId) {
      const adapterOptions: CheckOutAdapterOptions = {
        ...options,
        mode: input.mode ?? options.mode ?? "live",
        stubScenario: input.stubScenario ?? options.stubScenario ?? "success",
        userId: input.operatorUserId,
      };
      await executeHikCentralCheckOut(appointRecordId, adapterOptions);
    }

    const checkOutTimeUtc = input.checkOutTimeUtc || new Date().toISOString();

    const updatedVisit = await this.repository.checkOutVisit(visitId, {
      actualCheckOutTimeUtc: checkOutTimeUtc,
      operatorUserId: input.operatorUserId,
      operatorName: input.operatorName,
      reason: input.reason,
      isForced: input.isForced,
      appointRecordIdRevoked: appointRecordId,
    });

    return {
      ok: true,
      visit: updatedVisit,
    };
  }
}

export const defaultActiveMonitoringService = new ActiveMonitoringService(
  defaultVmsRepository,
);
