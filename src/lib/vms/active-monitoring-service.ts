import {
  evaluateAutoCheckIn,
  evaluateOverstayStatus,
  isEmergencyGrantActive,
  isTapQuotaExceeded,
  type ActiveVisitSummary,
  type CheckOutInput,
  type DoorTapEvent,
  type EmergencyAccessGrant,
  type GrantEmergencyAccessInput,
  type HostArrivalNotification,
} from "./checkout-contract";
import {
  executeHikCentralCheckOut,
  type CheckOutAdapterOptions,
} from "./hikcentral-checkout-adapter";
import {
  syncHikCentralEmergencyGrant,
  revokeHikCentralEmergencyGrant,
  type EmergencyAdapterOptions,
} from "./hikcentral-emergency-adapter";
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
  autoCheckedIn?: boolean;
  hostNotification?: HostArrivalNotification;
}

export interface CheckOutResult {
  ok: boolean;
  visit?: Visit;
  error?: string;
}

export interface EmergencyAccessResult {
  grant: EmergencyAccessGrant;
  visit?: Visit;
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

      const tapEvents = await this.repository.listDoorTapEvents(visit.id);
      tapEvents.sort(
        (a, b) =>
          new Date(a.tappedAtUtc).getTime() - new Date(b.tappedAtUtc).getTime(),
      );

      const checkInEvents = await this.repository.listCheckInEvents(visit.id);
      const isFastTrack = Boolean(
        visit.isFastTrack ||
          checkInEvents.some(
            (c) =>
              c.receptionistUserId === "system-auto-checkin" ||
              c.receptionistName?.toLowerCase().includes("fast-track") ||
              c.notes?.toLowerCase().includes("auto check-in") ||
              (c.verificationMethod === "biometric" &&
                c.receptionistUserId.includes("auto")),
          ),
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
        emergencyGrants: visit.emergencyGrants,
        lastSeenDoor: visit.lastSeenDoor,
        isFastTrack,
        movementBreadcrumbs: tapEvents,
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

    // Lookup door topology metadata
    const door =
      (await this.repository.findDoor(tapData.doorIndexCode, visit.facilityId)) ||
      (tapData.doorName
        ? await this.repository.getDoorByName(tapData.doorName, visit.facilityId)
        : undefined) ||
      (await this.repository.findDoor(tapData.doorIndexCode));

    const isPerimeter = tapData.isPerimeter ?? door?.isPerimeter ?? false;

    // Fast-track touchless auto check-in handling for visits in APPROVED status
    if (visit.status === "APPROVED") {
      const facility = await this.repository.getFacility(visit.facilityId);
      const earlyArrivalBufferMinutes =
        facility?.autoCheckInEarlyBufferMinutes ?? 15;

      const autoCheckInEval = evaluateAutoCheckIn({
        visit,
        door: {
          isPerimeter,
          doorName: tapData.doorName ?? door?.doorName,
          doorIndexCode: tapData.doorIndexCode,
        },
        tappedAtUtc: tapData.tappedAtUtc,
        direction: tapData.direction,
        earlyArrivalBufferMinutes,
      });

      if (!autoCheckInEval.eligible) {
        throw new Error(autoCheckInEval.error || "Auto check-in not eligible.");
      }

      const fullName =
        `${visit.visitorGivenName} ${visit.visitorFamilyName}`.trim();
      const doorDisplayName =
        tapData.doorName ?? door?.doorName ?? tapData.doorIndexCode;
      const tappedAtUtc = tapData.tappedAtUtc || new Date().toISOString();

      const hostNotification: HostArrivalNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        visitId: visit.id,
        hostId: visit.hostId,
        hostName: visit.hostName,
        visitorName: fullName,
        doorIndexCode: tapData.doorIndexCode,
        doorName: doorDisplayName,
        arrivedAtUtc: tappedAtUtc,
        message: `Visitor ${fullName} has arrived at ${doorDisplayName} and completed touchless check-in.`,
        createdAtUtc: new Date().toISOString(),
      };

      const initialTapEvent: DoorTapEvent = {
        ...tapData,
        doorName: doorDisplayName,
        direction: "in",
        inAndOutType: 1,
        isPerimeter: true,
        tappedAtUtc,
      };

      const autoResult = await this.repository.autoCheckInVisit({
        visitId,
        actualCheckInTimeUtc: tappedAtUtc,
        tapEvent: initialTapEvent,
        hostNotification,
      });

      const quotaExceeded = isTapQuotaExceeded(
        1,
        autoResult.visit.tapQuota,
      );

      let remainingTaps: number | undefined;
      if (autoResult.visit.tapQuota?.mode === "limited") {
        const max = autoResult.visit.tapQuota.maxTaps ?? 0;
        remainingTaps = Math.max(0, max - 1);
      }

      if (quotaExceeded) {
        const autoCheckOutInput: CheckOutInput = {
          visitId,
          operatorUserId: "system-tap-quota-enforcer",
          operatorName: "Tap Quota Auto-Enforcer",
          reason: `Automatic check-out: Tap quota exhausted (1/${autoResult.visit.tapQuota?.maxTaps ?? 0} taps reached).`,
          isForced: false,
          checkOutTimeUtc: tappedAtUtc,
          mode: options.mode,
          stubScenario: options.stubScenario,
        };

        const checkOutRes = await this.performCheckOut(
          visitId,
          autoCheckOutInput,
          options,
        );

        return {
          event: autoResult.event,
          visit: checkOutRes.visit ?? autoResult.visit,
          tapCount: 1,
          remainingTaps: 0,
          isQuotaExceeded: true,
          autoCheckedOut: true,
          autoCheckedIn: true,
          hostNotification: autoResult.notification,
        };
      }

      return {
        event: autoResult.event,
        visit: autoResult.visit,
        tapCount: 1,
        remainingTaps,
        isQuotaExceeded: false,
        autoCheckedOut: false,
        autoCheckedIn: true,
        hostNotification: autoResult.notification,
      };
    }

    if (visit.status !== "CHECKED_IN" && visit.status !== "OVERSTAY") {
      throw new Error(
        `Cannot record tap: Visit ${visitId} is in status '${visit.status}' (must be 'CHECKED_IN' or 'OVERSTAY').`,
      );
    }

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

    // Evaluate door access permission against standard access levels AND active emergency grants
    if (visit.accessLevelIds && visit.accessLevelIds.length > 0) {
      let isPermitted = false;

      // 1. Check standard access levels
      for (const alId of visit.accessLevelIds) {
        const al = await this.repository.getAccessLevel(alId);
        if (al && al.doors) {
          const matches = al.doors.some((d) => {
            const dNorm = d.toLowerCase();
            return (
              dNorm === tapData.doorIndexCode.toLowerCase() ||
              (tapData.doorName && dNorm === tapData.doorName.toLowerCase()) ||
              (door?.doorName && dNorm === door.doorName.toLowerCase()) ||
              (door?.doorIndexCode && dNorm === door.doorIndexCode.toLowerCase())
            );
          });
          if (matches) {
            isPermitted = true;
            break;
          }
        }
      }

      // 2. If not permitted by standard access levels, check active non-expired emergency grants
      if (!isPermitted) {
        const grants =
          visit.emergencyGrants && visit.emergencyGrants.length > 0
            ? visit.emergencyGrants
            : await this.repository.getEmergencyGrants(visitId);

        const tapTime = tapData.tappedAtUtc || new Date().toISOString();
        const matchingGrant = grants.find((g) => {
          if (!isEmergencyGrantActive(g, tapTime)) return false;
          const codeMatch = g.doorIndexCodes.some(
            (code) =>
              code.toLowerCase() === tapData.doorIndexCode.toLowerCase() ||
              (door?.doorIndexCode &&
                code.toLowerCase() === door.doorIndexCode.toLowerCase()),
          );
          if (codeMatch) return true;
          if (g.doorNames && g.doorNames.length > 0) {
            return g.doorNames.some((name) => {
              const nNorm = name.toLowerCase();
              return (
                (tapData.doorName && nNorm === tapData.doorName.toLowerCase()) ||
                (door?.doorName && nNorm === door.doorName.toLowerCase()) ||
                nNorm === tapData.doorIndexCode.toLowerCase()
              );
            });
          }
          return false;
        });

        if (matchingGrant) {
          isPermitted = true;
        }
      }

      if (!isPermitted) {
        const doorLabel = door?.doorName || tapData.doorName || tapData.doorIndexCode;
        throw new Error(
          `Access denied: Door '${doorLabel}' (${tapData.doorIndexCode}) is not authorized for visit ${visitId}. Emergency grant may be expired or revoked.`,
        );
      }
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
        autoCheckedIn: false,
      };
    }

    return {
      event: tapResult.event,
      visit: tapResult.visit,
      tapCount: tapResult.tapCount,
      remainingTaps,
      isQuotaExceeded: false,
      autoCheckedOut: false,
      autoCheckedIn: false,
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

    // Auto-revoke all ACTIVE emergency grants for this visit and de-authorize on hardware
    const grants = await this.repository.getEmergencyGrants(visitId);
    const activeGrants = grants.filter((g) => g.status === "ACTIVE");
    for (const grant of activeGrants) {
      await this.repository.revokeEmergencyGrant(
        grant.id,
        input.operatorUserId,
        input.operatorName || "Check-Out Auto-Revocation",
      );
      try {
        await revokeHikCentralEmergencyGrant(
          {
            visitId,
            visitorId: visit.hikCentral?.visitorId,
            doorIndexCodes: grant.doorIndexCodes,
            userId: input.operatorUserId,
          },
          {
            ...options,
            mode: input.mode ?? options.mode ?? "live",
            stubScenario: input.stubScenario ?? options.stubScenario ?? "success",
            userId: input.operatorUserId,
          },
        );
      } catch {
        // Continue check-out workflow even if hardware terminal is unreachable
      }
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

  /**
   * Grants immediate, time-bounded emergency access to additional doors for an active visit.
   * Synchronizes hardware terminal privileges immediately via HikCentral adapter.
   */
  async grantEmergencyAccess(
    visitId: string,
    input: GrantEmergencyAccessInput,
    options: EmergencyAdapterOptions = {},
  ): Promise<EmergencyAccessResult> {
    const visit = await this.repository.getVisit(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    if (visit.status !== "CHECKED_IN" && visit.status !== "OVERSTAY") {
      throw new Error(
        `Cannot grant emergency access: Visit ${visitId} is in status '${visit.status}' (must be 'CHECKED_IN' or 'OVERSTAY').`,
      );
    }

    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error("A business justification reason of at least 10 characters is required.");
    }

    if (!input.doorIndexCodes || input.doorIndexCodes.length === 0) {
      throw new Error("At least one door code is required.");
    }

    if (!input.grantedByUserId || !input.grantedByUserId.trim()) {
      throw new Error("Authorizing operator user ID is required.");
    }

    const grantedAtUtc = input.grantedAtUtc || new Date().toISOString();
    let expiresAtUtc = input.expiresAtUtc;
    if (!expiresAtUtc && input.durationHours && input.durationHours > 0) {
      expiresAtUtc = new Date(
        new Date(grantedAtUtc).getTime() + input.durationHours * 3600 * 1000,
      ).toISOString();
    }

    if (!expiresAtUtc) {
      throw new Error("Valid expiration timestamp or duration is required.");
    }

    const expiresAt = new Date(expiresAtUtc);
    if (
      isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= new Date(grantedAtUtc).getTime()
    ) {
      throw new Error("Expiration must be in the future.");
    }

    // Resolve door names
    const resolvedDoorNames: string[] = [];
    for (const code of input.doorIndexCodes) {
      const door = await this.repository.findDoor(code, visit.facilityId);
      resolvedDoorNames.push(door?.doorName || code);
    }

    const grant: EmergencyAccessGrant = {
      id: `emg-grant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId,
      doorIndexCodes: input.doorIndexCodes,
      doorNames: input.doorNames && input.doorNames.length > 0 ? input.doorNames : resolvedDoorNames,
      grantedByUserId: input.grantedByUserId.trim(),
      grantedByName: input.grantedByName?.trim() || input.grantedByUserId.trim(),
      reason: input.reason.trim(),
      grantedAtUtc,
      expiresAtUtc,
      status: "ACTIVE",
    };

    // Save grant in repository
    await this.repository.saveEmergencyGrant(grant);

    // Synchronize privileges to HikCentral physical controllers
    const adapterOptions: EmergencyAdapterOptions = {
      ...options,
      mode: input.mode ?? options.mode ?? "live",
      stubScenario: input.stubScenario ?? options.stubScenario ?? "success",
      userId: input.grantedByUserId,
    };

    await syncHikCentralEmergencyGrant(
      {
        visitId,
        visitorId: visit.hikCentral?.visitorId,
        doorIndexCodes: grant.doorIndexCodes,
        expiresAtUtc: grant.expiresAtUtc,
        userId: input.grantedByUserId,
      },
      adapterOptions,
    );

    const updatedVisit = await this.repository.getVisit(visitId);
    return {
      grant,
      visit: updatedVisit,
    };
  }

  /**
   * Manually revokes an emergency access grant early and de-authorizes terminal privileges on hardware.
   */
  async revokeEmergencyAccess(
    visitId: string,
    grantId: string,
    operatorUserId: string,
    operatorName?: string,
    options: EmergencyAdapterOptions = {},
  ): Promise<EmergencyAccessResult> {
    const visit = await this.repository.getVisit(visitId);
    if (!visit) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    const revokedGrant = await this.repository.revokeEmergencyGrant(
      grantId,
      operatorUserId,
      operatorName,
    );

    const adapterOptions: EmergencyAdapterOptions = {
      ...options,
      mode: options.mode ?? "live",
      stubScenario: options.stubScenario ?? "success",
      userId: operatorUserId,
    };

    await revokeHikCentralEmergencyGrant(
      {
        visitId,
        visitorId: visit.hikCentral?.visitorId,
        doorIndexCodes: revokedGrant.doorIndexCodes,
        userId: operatorUserId,
      },
      adapterOptions,
    );

    const updatedVisit = await this.repository.getVisit(visitId);
    return {
      grant: revokedGrant,
      visit: updatedVisit,
    };
  }
}

export const defaultActiveMonitoringService = new ActiveMonitoringService(
  defaultVmsRepository,
);
