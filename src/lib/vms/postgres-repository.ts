import { eq, and, asc, desc, or } from "drizzle-orm";
import type { VmsDatabase, VmsExecutor } from "../db/client";
import { createPostgresClient } from "../db/client";
import * as s from "../db/schema";
import type {
  CheckInVisitParams,
  CheckOutVisitParams,
  IVmsRepository,
  ListVisitsFilter,
  RecordDoorTapResult,
  UpdateVisitApprovalParams,
} from "./repository";
import type {
  HostEmployee,
  SystemSettings,
  Visit,
  VisitStatus,
} from "./vms-contract";
import { DEFAULT_SYSTEM_SETTINGS, isActiveVisitStatus } from "./vms-contract";
import { defaultSystemSettings } from "./system-settings-defaults";
import type { AccessLevel } from "./access-level-contract";
import type { ApprovalRecord } from "./approval-contract";
import type { CheckInAuditEvent, VerificationMethod } from "./checkin-contract";
import type {
  CheckOutAuditEvent,
  DoorDirection,
  DoorTapEvent,
  EmergencyAccessGrant,
  FacilityDoor,
  HostArrivalNotification,
  VisitLastSeenDoor,
} from "./checkout-contract";
import type { VisitorProfile } from "./group-contract";
import type { InvitationToken } from "./invitation-contract";

/** A tap as written to `door_tap_events`: id and time are always filled in. */
type StoredDoorTapEvent = DoorTapEvent & { id: string; tappedAtUtc: string };

export class PostgresVmsRepository implements IVmsRepository {
  private injectedDb?: VmsDatabase;

  constructor(db?: VmsDatabase) {
    this.injectedDb = db;
  }

  // Resolved lazily so importing this module (e.g. during `next build`) never
  // requires DATABASE_URL; the connection is only demanded on the first query.
  private get db(): VmsDatabase {
    this.injectedDb ??= createPostgresClient();
    return this.injectedDb;
  }

  // 0. Global System Settings (Single-Site Architecture)
  async getSettings(): Promise<SystemSettings> {
    const rows = await this.db
      .select()
      .from(s.systemSettings)
      .where(eq(s.systemSettings.id, "default"));

    if (rows.length === 0) {
      return defaultSystemSettings();
    }

    // Backfill siteName for rows written before the single-site contract migration.
    const data = structuredClone(rows[0].data);
    return { ...data, siteName: data.siteName ?? DEFAULT_SYSTEM_SETTINGS.siteName };
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    const updated: SystemSettings = {
      ...current,
      ...cleanedUpdates,
      id: "default",
      updatedAt: new Date().toISOString(),
    };

    await this.db
      .insert(s.systemSettings)
      .values({
        id: "default",
        siteName: updated.siteName,
        timezone: updated.timezone,
        overstayGraceMinutes: updated.overstayGraceMinutes,
        autoCheckInEarlyBufferMinutes: updated.autoCheckInEarlyBufferMinutes,
        updatedAt: updated.updatedAt ?? new Date().toISOString(),
        data: updated,
      })
      .onConflictDoUpdate({
        target: s.systemSettings.id,
        set: {
          siteName: updated.siteName,
          timezone: updated.timezone,
          overstayGraceMinutes: updated.overstayGraceMinutes,
          autoCheckInEarlyBufferMinutes: updated.autoCheckInEarlyBufferMinutes,
          updatedAt: updated.updatedAt ?? new Date().toISOString(),
          data: updated,
        },
      });

    return structuredClone(updated);
  }

  // 1. Visits
  private async enrichVisitEmergencyGrants(visit: Visit): Promise<void> {
    const now = Date.now();
    const allGrants = await this.getEmergencyGrants(visit.id);
    const activeGrants = allGrants.filter((g) => {
      if (g.status === "ACTIVE") {
        if (new Date(g.expiresAtUtc).getTime() <= now) {
          return false;
        }
        return true;
      }
      return false;
    });

    if (activeGrants.length > 0) {
      visit.emergencyGrants = activeGrants.map((g) => structuredClone(g));
    } else if (visit.emergencyGrants !== undefined) {
      visit.emergencyGrants = [];
    }
  }

  async getVisit(id: string): Promise<Visit | undefined> {
    const rows = await this.db.select().from(s.visits).where(eq(s.visits.id, id));
    if (rows.length === 0) return undefined;
    const visit = structuredClone(rows[0].data);
    await this.enrichVisitEmergencyGrants(visit);
    return visit;
  }

  async listVisits(filter?: ListVisitsFilter): Promise<Visit[]> {
    const query = this.db.select().from(s.visits);
    const conditions = [];
    if (filter?.status) {
      conditions.push(eq(s.visits.status, filter.status));
    }

    const rows =
      conditions.length > 0
        ? await query.where(and(...conditions)).orderBy(desc(s.visits.createdAtUtc))
        : await query.orderBy(desc(s.visits.createdAtUtc));

    return rows.map((r) => structuredClone(r.data));
  }

  async saveVisit(visit: Visit): Promise<void> {
    await this.writeVisit(this.db, visit);
  }

  private async writeVisit(executor: VmsExecutor, visit: Visit): Promise<void> {
    const cloned = structuredClone(visit);
    await executor
      .insert(s.visits)
      .values({
        id: cloned.id,
        status: cloned.status,
        createdAtUtc: cloned.createdAtUtc,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.visits.id,
        set: {
          status: cloned.status,
          data: cloned,
        },
      });
  }

  async updateVisit(id: string, updates: Partial<Visit>): Promise<Visit> {
    const existing = await this.getVisit(id);
    if (!existing) {
      throw new Error(`Visit not found: ${id}`);
    }
    const updated: Visit = {
      ...existing,
      ...updates,
      updatedAtUtc: new Date().toISOString(),
    };
    await this.saveVisit(updated);
    return structuredClone(updated);
  }

  // 3. Search & Check-in
  async searchVisits(
    query: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]> {
    let list = await this.listVisits({});

    if (status) {
      const allowed = Array.isArray(status) ? status : [status];
      list = list.filter((v) => allowed.includes(v.status));
    }

    const q = query.trim().toLowerCase();
    if (!q) {
      return list;
    }

    return list.filter((v) => {
      const fullName1 =
        `${v.visitorGivenName} ${v.visitorFamilyName}`.toLowerCase();
      const fullName2 =
        `${v.visitorFamilyName} ${v.visitorGivenName}`.toLowerCase();
      return (
        v.id.toLowerCase().includes(q) ||
        v.visitorGivenName.toLowerCase().includes(q) ||
        v.visitorFamilyName.toLowerCase().includes(q) ||
        fullName1.includes(q) ||
        fullName2.includes(q) ||
        (v.visitorPhone && v.visitorPhone.toLowerCase().includes(q)) ||
        (v.visitorEmail && v.visitorEmail.toLowerCase().includes(q)) ||
        (v.certificateNo && v.certificateNo.toLowerCase().includes(q)) ||
        (v.hikCentral?.appointCode &&
          v.hikCentral.appointCode.toLowerCase().includes(q)) ||
        (v.hikCentral?.appointRecordId &&
          v.hikCentral.appointRecordId.toLowerCase().includes(q)) ||
        (v.invitationToken && v.invitationToken.toLowerCase().includes(q))
      );
    });
  }

  async checkInVisit(
    visitId: string,
    checkInData: CheckInVisitParams,
  ): Promise<Visit> {
    const existing = await this.getVisit(visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    const auditEvent: CheckInAuditEvent = {
      id: `chk-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId,
      checkedInAtUtc: checkInData.actualCheckInTimeUtc,
      receptionistUserId: checkInData.receptionistUserId,
      receptionistName: checkInData.receptionistName,
      verificationMethod:
        (checkInData.verificationMethod as VerificationMethod) || "manual",
      notes: checkInData.notes,
    };

    const updated: Visit = {
      ...existing,
      status: "CHECKED_IN",
      actualCheckInTimeUtc: checkInData.actualCheckInTimeUtc,
      hikCentral: checkInData.hikCentral
        ? {
            ...existing.hikCentral,
            ...checkInData.hikCentral,
          }
        : existing.hikCentral,
      credentialSyncStatus:
        checkInData.credentialSyncStatus ?? existing.credentialSyncStatus,
      updatedAtUtc: new Date().toISOString(),
    };

    await this.db.transaction(async (tx) => {
      await this.writeCheckInEvent(tx, auditEvent);
      await this.writeVisit(tx, updated);
    });
    return structuredClone(updated);
  }

  async saveCheckInEvent(event: CheckInAuditEvent): Promise<void> {
    await this.writeCheckInEvent(this.db, event);
  }

  private async writeCheckInEvent(
    executor: VmsExecutor,
    event: CheckInAuditEvent,
  ): Promise<void> {
    const cloned = structuredClone(event);
    await executor
      .insert(s.checkInAuditEvents)
      .values({
        id: cloned.id,
        visitId: cloned.visitId,
        timestampUtc: cloned.checkedInAtUtc,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.checkInAuditEvents.id,
        set: { data: cloned },
      });
  }

  async listCheckInEvents(visitId?: string): Promise<CheckInAuditEvent[]> {
    const rows = visitId
      ? await this.db
          .select()
          .from(s.checkInAuditEvents)
          .where(eq(s.checkInAuditEvents.visitId, visitId))
          .orderBy(desc(s.checkInAuditEvents.timestampUtc))
      : await this.db
          .select()
          .from(s.checkInAuditEvents)
          .orderBy(desc(s.checkInAuditEvents.timestampUtc));

    return rows.map((r) => structuredClone(r.data));
  }

  // 4. Approvals
  async getVisitsByStatus(
    statuses: VisitStatus | VisitStatus[],
  ): Promise<Visit[]> {
    const targetStatuses = Array.isArray(statuses) ? statuses : [statuses];
    const all = await this.listVisits({});
    return all.filter((v) => targetStatuses.includes(v.status));
  }

  async saveApprovalRecord(record: ApprovalRecord): Promise<void> {
    await this.writeApprovalRecord(this.db, record);
  }

  private async writeApprovalRecord(
    executor: VmsExecutor,
    record: ApprovalRecord,
  ): Promise<void> {
    const cloned = structuredClone(record);
    await executor
      .insert(s.approvalRecords)
      .values({
        id: cloned.id,
        visitId: cloned.visitId,
        decidedAtUtc: cloned.decidedAtUtc,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.approvalRecords.id,
        set: {
          decidedAtUtc: cloned.decidedAtUtc,
          data: cloned,
        },
      });
  }

  async listApprovalRecords(visitId?: string): Promise<ApprovalRecord[]> {
    const rows = visitId
      ? await this.db
          .select()
          .from(s.approvalRecords)
          .where(eq(s.approvalRecords.visitId, visitId))
          .orderBy(desc(s.approvalRecords.decidedAtUtc))
      : await this.db
          .select()
          .from(s.approvalRecords)
          .orderBy(desc(s.approvalRecords.decidedAtUtc));

    return rows.map((r) => structuredClone(r.data));
  }

  async updateVisitStatusWithApproval(
    visitId: string,
    decision: UpdateVisitApprovalParams,
  ): Promise<Visit> {
    const existing = await this.getVisit(visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    const updated: Visit = {
      ...existing,
      status: decision.newStatus,
      approvalRecord: structuredClone(decision.approvalRecord),
      credentialSyncStatus:
        decision.credentialSyncStatus ?? existing.credentialSyncStatus,
      updatedAtUtc: new Date().toISOString(),
    };
    await this.db.transaction(async (tx) => {
      await this.writeApprovalRecord(tx, decision.approvalRecord);
      await this.writeVisit(tx, updated);
    });
    return structuredClone(updated);
  }

  // 5. Invitation tokens
  async createInvitationToken(invitation: InvitationToken): Promise<void> {
    const cloned = structuredClone(invitation);
    await this.db
      .insert(s.invitationTokens)
      .values({
        token: cloned.token,
        visitId: cloned.visitId,
        isConsumed: cloned.isConsumed ?? false,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.invitationTokens.token,
        set: {
          isConsumed: cloned.isConsumed ?? false,
          data: cloned,
        },
      });
  }

  async getInvitationToken(token: string): Promise<InvitationToken | undefined> {
    const rows = await this.db
      .select()
      .from(s.invitationTokens)
      .where(eq(s.invitationTokens.token, token));
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }

  async getVisitByInvitationToken(
    token: string,
  ): Promise<{ visit: Visit; token: InvitationToken } | undefined> {
    const tok = await this.getInvitationToken(token);
    if (!tok) return undefined;
    const visit = await this.getVisit(tok.visitId);
    if (!visit) return undefined;
    return { visit, token: tok };
  }

  async consumeInvitationToken(
    token: string,
    consumedAtUtc?: string,
  ): Promise<InvitationToken> {
    const existing = await this.getInvitationToken(token);
    if (!existing) {
      throw new Error(`Invitation token not found: ${token}`);
    }
    if (existing.isConsumed) {
      throw new Error(`Invitation token already consumed: ${token}`);
    }
    const updated: InvitationToken = {
      ...existing,
      isConsumed: true,
      consumedAtUtc: consumedAtUtc ?? new Date().toISOString(),
    };
    await this.createInvitationToken(updated);
    return structuredClone(updated);
  }

  // 6. Access levels
  async listAccessLevels(): Promise<AccessLevel[]> {
    const rows = await this.db.select().from(s.accessLevels);
    return rows.map((r) => structuredClone(r.data));
  }

  async getAccessLevel(id: string): Promise<AccessLevel | undefined> {
    const rows = await this.db
      .select()
      .from(s.accessLevels)
      .where(eq(s.accessLevels.id, id));
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }

  async saveAccessLevel(accessLevel: AccessLevel): Promise<void> {
    const cloned = structuredClone(accessLevel);
    await this.db
      .insert(s.accessLevels)
      .values({
        id: cloned.id,
        name: cloned.name,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.accessLevels.id,
        set: {
          name: cloned.name,
          data: cloned,
        },
      });
  }

  async saveAccessLevels(accessLevels: AccessLevel[]): Promise<void> {
    for (const al of accessLevels) {
      await this.saveAccessLevel(al);
    }
  }

  async deleteAccessLevel(id: string): Promise<void> {
    await this.db.delete(s.accessLevels).where(eq(s.accessLevels.id, id));
  }

  // 7. Active Visits, Door Taps & Check-out
  async listActiveVisits(): Promise<Visit[]> {
    const all = await this.listVisits({});
    const active = all.filter((v) => isActiveVisitStatus(v.status));
    for (const v of active) {
      await this.enrichVisitEmergencyGrants(v);
    }
    return active;
  }

  async recordDoorTap(tapEvent: DoorTapEvent): Promise<RecordDoorTapResult> {
    const existing = await this.getVisit(tapEvent.visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${tapEvent.visitId}`);
    }

    const isImplicit = Boolean(tapEvent.isImplicit || tapEvent.implicit);
    const direction = tapEvent.direction ?? "in";
    const inAndOutType = tapEvent.inAndOutType ?? (direction === "in" ? 1 : 2);

    // A gateway retry repeats the event id, or the same time, Door and direction.
    const existingTap = await this.findRecordedTap(tapEvent, direction);
    if (existingTap) {
      return this.replayedTap(existing, existingTap);
    }

    const door = await this.resolveTapDoor(tapEvent);
    const doorName = tapEvent.doorName ?? door?.doorName;
    const isPerimeter = tapEvent.isPerimeter ?? door?.isPerimeter ?? false;

    const eventId =
      tapEvent.id ||
      `tap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const eventToStore: StoredDoorTapEvent = {
      ...tapEvent,
      id: eventId,
      tappedAtUtc: tapEvent.tappedAtUtc || new Date().toISOString(),
      direction,
      doorName,
      inAndOutType,
      isPerimeter,
      isImplicit: isImplicit || undefined,
      implicit: isImplicit || undefined,
      transitionNote: tapEvent.transitionNote,
    };

    // Implicit taps (Implicit Room Transition) do not count against the Tap Quota.
    const newTapCount = (existing.tapCount ?? 0) + (isImplicit ? 0 : 1);

    const updatedLastSeenDoor: VisitLastSeenDoor = {
      doorIndexCode: eventToStore.doorIndexCode,
      doorName: eventToStore.doorName,
      tappedAtUtc: eventToStore.tappedAtUtc,
      direction: eventToStore.direction,
      accessType: door?.accessType,
      isPerimeter: eventToStore.isPerimeter,
    };

    const updatedVisit: Visit = {
      ...existing,
      tapCount: newTapCount,
      lastSeenDoor: updatedLastSeenDoor,
      updatedAtUtc: new Date().toISOString(),
    };

    const recorded = await this.db.transaction(async (tx) => {
      if (!(await this.writeDoorTapEvent(tx, eventToStore))) return false;
      await this.writeVisit(tx, updatedVisit);
      return true;
    });

    if (!recorded) {
      // A concurrent delivery of the same event id won the insert.
      const raced = await this.findRecordedTap(eventToStore, direction);
      if (!raced) {
        throw new Error(`Door tap id already used by another Visit: ${eventId}`);
      }
      const current = await this.getVisit(tapEvent.visitId);
      return this.replayedTap(current ?? existing, raced);
    }

    return {
      event: structuredClone(eventToStore),
      visit: structuredClone(updatedVisit),
      tapCount: newTapCount,
    };
  }

  /** The tapped Door: by index code, falling back to a case-insensitive name match. */
  private async resolveTapDoor(tapEvent: DoorTapEvent): Promise<FacilityDoor | undefined> {
    return (
      (await this.getDoor(tapEvent.doorIndexCode)) ??
      (tapEvent.doorName ? await this.getDoorByName(tapEvent.doorName) : undefined)
    );
  }

  private replayedTap(visit: Visit, event: StoredDoorTapEvent): RecordDoorTapResult {
    return {
      event,
      visit: structuredClone(visit),
      tapCount: visit.tapCount ?? 0,
    };
  }

  private async findRecordedTap(
    tapEvent: DoorTapEvent,
    direction: DoorDirection,
  ): Promise<StoredDoorTapEvent | undefined> {
    const matchers = [];
    if (tapEvent.id) matchers.push(eq(s.doorTapEvents.id, tapEvent.id));
    if (tapEvent.tappedAtUtc) {
      matchers.push(eq(s.doorTapEvents.tappedAtUtc, tapEvent.tappedAtUtc));
    }
    if (matchers.length === 0) return undefined;

    const rows = await this.db
      .select()
      .from(s.doorTapEvents)
      .where(and(eq(s.doorTapEvents.visitId, tapEvent.visitId), or(...matchers)));

    const match = rows.find(
      (r) =>
        (Boolean(tapEvent.id) && r.id === tapEvent.id) ||
        (r.tappedAtUtc === tapEvent.tappedAtUtc &&
          r.data.doorIndexCode === tapEvent.doorIndexCode &&
          r.data.direction === direction),
    );
    return match
      ? { ...structuredClone(match.data), id: match.id, tappedAtUtc: match.tappedAtUtc }
      : undefined;
  }

  /** Inserts the tap; returns false when a tap with the same id already exists. */
  private async writeDoorTapEvent(
    executor: VmsExecutor,
    event: StoredDoorTapEvent,
  ): Promise<boolean> {
    const cloned = structuredClone(event);
    const inserted = await executor
      .insert(s.doorTapEvents)
      .values({
        id: cloned.id,
        visitId: cloned.visitId,
        tappedAtUtc: cloned.tappedAtUtc,
        data: cloned,
      })
      .onConflictDoNothing({ target: s.doorTapEvents.id })
      .returning({ id: s.doorTapEvents.id });
    return inserted.length > 0;
  }

  async listDoorTapEvents(visitId?: string): Promise<DoorTapEvent[]> {
    const rows = visitId
      ? await this.db
          .select()
          .from(s.doorTapEvents)
          .where(eq(s.doorTapEvents.visitId, visitId))
          .orderBy(desc(s.doorTapEvents.tappedAtUtc))
      : await this.db
          .select()
          .from(s.doorTapEvents)
          .orderBy(desc(s.doorTapEvents.tappedAtUtc));

    return rows.map((r) => structuredClone(r.data));
  }

  async checkOutVisit(
    visitId: string,
    checkOutData: CheckOutVisitParams,
  ): Promise<Visit> {
    const existing = await this.getVisit(visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    const auditEvent: CheckOutAuditEvent = {
      id: `chkout-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId,
      checkedOutAtUtc: checkOutData.actualCheckOutTimeUtc,
      operatorUserId: checkOutData.operatorUserId,
      operatorName: checkOutData.operatorName,
      reason: checkOutData.reason,
      isForced: checkOutData.isForced,
      appointRecordIdRevoked: checkOutData.appointRecordIdRevoked,
    };

    const updated: Visit = {
      ...existing,
      status: "CHECKED_OUT",
      actualCheckOutTimeUtc: checkOutData.actualCheckOutTimeUtc,
      checkOutReason: checkOutData.reason,
      isForcedCheckOut: checkOutData.isForced,
      checkedOutByUserId: checkOutData.operatorUserId,
      updatedAtUtc: new Date().toISOString(),
    };
    await this.db.transaction(async (tx) => {
      await this.writeCheckOutEvent(tx, auditEvent);
      await this.writeVisit(tx, updated);
    });
    return structuredClone(updated);
  }

  async saveCheckOutEvent(event: CheckOutAuditEvent): Promise<void> {
    await this.writeCheckOutEvent(this.db, event);
  }

  private async writeCheckOutEvent(
    executor: VmsExecutor,
    event: CheckOutAuditEvent,
  ): Promise<void> {
    const cloned = structuredClone(event);
    await executor
      .insert(s.checkOutAuditEvents)
      .values({
        id: cloned.id,
        visitId: cloned.visitId,
        timestampUtc: cloned.checkedOutAtUtc,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.checkOutAuditEvents.id,
        set: { data: cloned },
      });
  }

  async listCheckOutEvents(visitId?: string): Promise<CheckOutAuditEvent[]> {
    const rows = visitId
      ? await this.db
          .select()
          .from(s.checkOutAuditEvents)
          .where(eq(s.checkOutAuditEvents.visitId, visitId))
          .orderBy(desc(s.checkOutAuditEvents.timestampUtc))
      : await this.db
          .select()
          .from(s.checkOutAuditEvents)
          .orderBy(desc(s.checkOutAuditEvents.timestampUtc));

    return rows.map((r) => structuredClone(r.data));
  }

  // 8. Emergency access
  async saveEmergencyGrant(grant: EmergencyAccessGrant): Promise<void> {
    const cloned = structuredClone(grant);
    await this.db
      .insert(s.emergencyAccessGrants)
      .values({
        id: cloned.id,
        visitId: cloned.visitId,
        createdAtUtc: cloned.grantedAtUtc,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.emergencyAccessGrants.id,
        set: {
          data: cloned,
        },
      });
  }

  async getEmergencyGrants(visitId?: string): Promise<EmergencyAccessGrant[]> {
    const rows = visitId
      ? await this.db
          .select()
          .from(s.emergencyAccessGrants)
          .where(eq(s.emergencyAccessGrants.visitId, visitId))
          .orderBy(desc(s.emergencyAccessGrants.createdAtUtc))
      : await this.db
          .select()
          .from(s.emergencyAccessGrants)
          .orderBy(desc(s.emergencyAccessGrants.createdAtUtc));

    return rows.map((r) => structuredClone(r.data));
  }

  async revokeEmergencyGrant(
    grantId: string,
    operatorUserId: string,
    operatorName?: string,
  ): Promise<EmergencyAccessGrant> {
    const rows = await this.db
      .select()
      .from(s.emergencyAccessGrants)
      .where(eq(s.emergencyAccessGrants.id, grantId));
    if (rows.length === 0) {
      throw new Error(`Emergency grant not found: ${grantId}`);
    }

    const now = new Date().toISOString();
    const existing = structuredClone(rows[0].data);
    const updated: EmergencyAccessGrant = {
      ...existing,
      status: "REVOKED",
      revokedAtUtc: now,
      revokedByUserId: operatorUserId,
      revokedByName: operatorName,
    };

    await this.saveEmergencyGrant(updated);
    return structuredClone(updated);
  }

  // 9. Doors
  async getDoor(doorIndexCode: string): Promise<FacilityDoor | undefined> {
    const rows = await this.db
      .select()
      .from(s.facilityDoors)
      .where(eq(s.facilityDoors.doorIndexCode, doorIndexCode));
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }

  async getDoorByName(doorName: string): Promise<FacilityDoor | undefined> {
    const all = await this.listDoors();
    return all.find((d) => d.doorName.toLowerCase() === doorName.toLowerCase());
  }

  async findDoor(codeOrName: string): Promise<FacilityDoor | undefined> {
    const byCode = await this.getDoor(codeOrName);
    if (byCode) return byCode;
    return await this.getDoorByName(codeOrName);
  }

  async listDoors(): Promise<FacilityDoor[]> {
    const rows = await this.db.select().from(s.facilityDoors);
    return rows.map((r) => structuredClone(r.data));
  }

  async saveDoor(door: FacilityDoor): Promise<void> {
    const cloned = structuredClone(door);
    await this.db
      .insert(s.facilityDoors)
      .values({
        doorIndexCode: cloned.doorIndexCode,
        regionIndexCode: cloned.regionIndexCode ?? null,
        doorName: cloned.doorName,
        isPerimeter: Boolean(cloned.isPerimeter),
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.facilityDoors.doorIndexCode,
        set: {
          regionIndexCode: cloned.regionIndexCode ?? null,
          doorName: cloned.doorName,
          isPerimeter: Boolean(cloned.isPerimeter),
          data: cloned,
        },
      });
  }

  async saveDoors(doors: FacilityDoor[]): Promise<void> {
    for (const d of doors) {
      await this.saveDoor(d);
    }
  }

  // 10. Visitor profiles
  async findVisitorProfileByCertificate(
    certificateNo: string,
  ): Promise<VisitorProfile | undefined> {
    const rows = await this.db
      .select()
      .from(s.visitorProfiles)
      .where(
        and(
          eq(s.visitorProfiles.certificateNo, certificateNo.trim()),
          eq(s.visitorProfiles.isDeleted, false),
        ),
      );
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }

  async getVisitorProfile(id: string): Promise<VisitorProfile | undefined> {
    const rows = await this.db
      .select()
      .from(s.visitorProfiles)
      .where(eq(s.visitorProfiles.id, id));
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }

  async saveVisitorProfile(profile: VisitorProfile): Promise<void> {
    const cloned = structuredClone(profile);
    await this.db
      .insert(s.visitorProfiles)
      .values({
        id: cloned.id,
        certificateNo: cloned.certificateNo,
        isDeleted: Boolean(cloned.isDeleted),
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.visitorProfiles.id,
        set: {
          certificateNo: cloned.certificateNo,
          isDeleted: Boolean(cloned.isDeleted),
          data: cloned,
        },
      });
  }

  async softDeleteVisitorProfile(
    id: string,
    isDeleted: boolean,
    reason?: string,
  ): Promise<VisitorProfile> {
    const existing = await this.getVisitorProfile(id);
    if (!existing) {
      throw new Error(`Visitor profile not found: ${id}`);
    }

    const now = new Date().toISOString();
    const updated: VisitorProfile = {
      ...existing,
      isDeleted,
      deletedAtUtc: isDeleted ? now : undefined,
      deletionReason: isDeleted ? reason : undefined,
      updatedAtUtc: now,
    };
    await this.saveVisitorProfile(updated);
    return structuredClone(updated);
  }

  async listVisitorProfiles(options?: {
    includeDeleted?: boolean;
    query?: string;
  }): Promise<VisitorProfile[]> {
    const rows = await this.db.select().from(s.visitorProfiles);
    const q = options?.query?.trim().toLowerCase();

    return rows
      .map((r) => structuredClone(r.data))
      .filter((p) => {
        if (!options?.includeDeleted && p.isDeleted) return false;
        if (!q) return true;
        const name = `${p.givenName ?? ""} ${p.familyName ?? ""} ${p.fullName ?? ""}`.toLowerCase();
        return (
          name.includes(q) ||
          p.certificateNo.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q))
        );
      });
  }

  async listVisitsByGroup(groupId: string): Promise<Visit[]> {
    const all = await this.listVisits();
    return all.filter((v) => v.groupId === groupId);
  }

  // 11. Hosts
  async saveHost(host: HostEmployee): Promise<void> {
    const cloned = structuredClone(host);
    await this.db
      .insert(s.hostEmployees)
      .values({
        id: cloned.id,
        name: cloned.name,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.hostEmployees.id,
        set: {
          name: cloned.name,
          data: cloned,
        },
      });
  }

  async saveHosts(hosts: HostEmployee[]): Promise<void> {
    for (const h of hosts) {
      await this.saveHost(h);
    }
  }

  async listHosts(query?: string): Promise<HostEmployee[]> {
    const rows = await this.db.select().from(s.hostEmployees);
    const q = query?.trim().toLowerCase();
    return rows
      .map((r) => structuredClone(r.data))
      .filter((h) => {
        if (!q) return true;
        return (
          h.name.toLowerCase().includes(q) ||
          (h.email && h.email.toLowerCase().includes(q)) ||
          (h.personCode && h.personCode.toLowerCase().includes(q))
        );
      });
  }

  async getHost(id: string): Promise<HostEmployee | undefined> {
    const rows = await this.db
      .select()
      .from(s.hostEmployees)
      .where(eq(s.hostEmployees.id, id));
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }

  // 12. Host arrival notifications & touchless auto check-in
  async saveHostNotification(notification: HostArrivalNotification): Promise<void> {
    await this.writeHostNotification(this.db, notification);
  }

  private async writeHostNotification(
    executor: VmsExecutor,
    notification: HostArrivalNotification,
  ): Promise<void> {
    const cloned = structuredClone(notification);
    await executor
      .insert(s.hostArrivalNotifications)
      .values({
        id: cloned.id,
        hostId: cloned.hostId,
        visitId: cloned.visitId,
        createdAtUtc: cloned.createdAtUtc,
        data: cloned,
      })
      .onConflictDoUpdate({
        target: s.hostArrivalNotifications.id,
        set: { data: cloned },
      });
  }

  async listHostNotifications(hostId?: string, visitId?: string): Promise<HostArrivalNotification[]> {
    const rows = await this.db.select().from(s.hostArrivalNotifications);
    return rows
      .map((r) => structuredClone(r.data))
      .filter((n) => {
        if (hostId && n.hostId !== hostId) return false;
        if (visitId && n.visitId !== visitId) return false;
        return true;
      });
  }

  /**
   * Fast-Track Auto Check-In: an approved Visitor's biometric scan at a Perimeter
   * Door checks the Visit in. The entry tap, the check-in audit event, the Host
   * arrival notification and the CHECKED_IN Visit are written in one transaction.
   * A Visit that is already CHECKED_IN or OVERSTAY is returned unchanged.
   */
  async autoCheckInVisit(params: {
    visitId: string;
    actualCheckInTimeUtc: string;
    tapEvent: DoorTapEvent;
    hostNotification?: HostArrivalNotification;
  }): Promise<{ visit: Visit; event: DoorTapEvent; notification?: HostArrivalNotification }> {
    const existing = await this.getVisit(params.visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${params.visitId}`);
    }
    if (isActiveVisitStatus(existing.status)) {
      return this.replayedAutoCheckIn(existing, params.tapEvent);
    }

    const { tapEvent } = params;
    const door = await this.resolveTapDoor(tapEvent);
    const doorName = tapEvent.doorName ?? door?.doorName;
    // Only Perimeter Doors trigger Fast-Track, so an unknown Door counts as one.
    const isPerimeter = tapEvent.isPerimeter ?? door?.isPerimeter ?? true;

    const eventToStore: StoredDoorTapEvent = {
      ...tapEvent,
      id:
        tapEvent.id ||
        `tap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId: params.visitId,
      tappedAtUtc: tapEvent.tappedAtUtc || params.actualCheckInTimeUtc,
      direction: "in",
      doorName,
      inAndOutType: 1,
      isPerimeter,
    };

    const auditEvent: CheckInAuditEvent = {
      id: `chk-audit-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId: params.visitId,
      checkedInAtUtc: params.actualCheckInTimeUtc,
      receptionistUserId: "system-auto-checkin",
      receptionistName: "Touchless Perimeter Fast-Track",
      verificationMethod: "biometric",
      // Active monitoring recognises "auto check-in" in the note as a Fast-Track entry.
      notes: `Fast-Track auto check-in at Perimeter Door: ${doorName || tapEvent.doorIndexCode}`,
    };

    const updatedVisit: Visit = {
      ...existing,
      status: "CHECKED_IN",
      actualCheckInTimeUtc: params.actualCheckInTimeUtc,
      // The entry tap is the first tap against the Tap Quota.
      tapCount: 1,
      lastSeenDoor: {
        doorIndexCode: eventToStore.doorIndexCode,
        doorName: eventToStore.doorName,
        tappedAtUtc: eventToStore.tappedAtUtc,
        direction: "in",
        accessType: door?.accessType,
        isPerimeter,
      },
      isFastTrack: true,
      updatedAtUtc: new Date().toISOString(),
    };

    const recorded = await this.db.transaction(async (tx) => {
      // The tap goes first: if a concurrent delivery already stored this event id,
      // stop before writing the audit event, notification or Visit.
      if (!(await this.writeDoorTapEvent(tx, eventToStore))) return false;
      await this.writeCheckInEvent(tx, auditEvent);
      if (params.hostNotification) {
        await this.writeHostNotification(tx, params.hostNotification);
      }
      await this.writeVisit(tx, updatedVisit);
      return true;
    });

    if (!recorded) {
      // A concurrent delivery of the same event id won and checked the Visit in.
      const raced = await this.findRecordedTap(eventToStore, "in");
      if (!raced) {
        throw new Error(`Door tap id already used by another Visit: ${eventToStore.id}`);
      }
      const current = await this.getVisit(params.visitId);
      return { visit: structuredClone(current ?? existing), event: raced };
    }

    return {
      visit: structuredClone(updatedVisit),
      event: structuredClone(eventToStore),
      notification: params.hostNotification
        ? structuredClone(params.hostNotification)
        : undefined,
    };
  }

  /**
   * The no-op result for a perimeter scan on a Visit that is already checked in:
   * the stored Visit and the tap that matches this scan (same event id, or same
   * time, Door and direction), else the Visit's first tap. Nothing is written,
   * so no notification is returned.
   */
  private async replayedAutoCheckIn(
    visit: Visit,
    tapEvent: DoorTapEvent,
  ): Promise<{ visit: Visit; event: DoorTapEvent }> {
    const match =
      (await this.findRecordedTap({ ...tapEvent, visitId: visit.id }, "in")) ??
      (await this.findFirstTap(visit.id));
    return {
      visit: structuredClone(visit),
      event: structuredClone(match ?? tapEvent),
    };
  }

  private async findFirstTap(visitId: string): Promise<DoorTapEvent | undefined> {
    const rows = await this.db
      .select()
      .from(s.doorTapEvents)
      .where(eq(s.doorTapEvents.visitId, visitId))
      .orderBy(asc(s.doorTapEvents.tappedAtUtc))
      .limit(1);
    return rows.length > 0 ? structuredClone(rows[0].data) : undefined;
  }
}
