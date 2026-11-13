import type {
  CredentialSyncStatus,
  Facility,
  HikCentralVisitReference,
  Visit,
  VisitStatus,
} from "./vms-contract";
import type { InvitationToken } from "./invitation-contract";
import type { ApprovalRecord } from "./approval-contract";
import type { AccessLevel } from "./access-level-contract";
import type {
  CheckInAuditEvent,
  VerificationMethod,
} from "./checkin-contract";
import type {
  CheckOutAuditEvent,
  DoorTapEvent,
} from "./checkout-contract";

export interface ListVisitsFilter {
  facilityId?: string;
  status?: string;
}

export interface UpdateVisitApprovalParams {
  newStatus: VisitStatus;
  approvalRecord: ApprovalRecord;
  credentialSyncStatus?: CredentialSyncStatus;
}

export interface CheckInVisitParams {
  actualCheckInTimeUtc: string;
  receptionistUserId: string;
  receptionistName?: string;
  verificationMethod?: VerificationMethod | string;
  hikCentral?: HikCentralVisitReference;
  credentialSyncStatus?: CredentialSyncStatus;
  notes?: string;
}

export interface CheckOutVisitParams {
  actualCheckOutTimeUtc: string;
  operatorUserId: string;
  operatorName?: string;
  reason?: string;
  isForced: boolean;
  appointRecordIdRevoked?: string;
}

export interface RecordDoorTapResult {
  event: DoorTapEvent;
  visit: Visit;
  tapCount: number;
}

export interface IVmsRepository {
  getFacility(id: string): Promise<Facility | undefined>;
  listFacilities(): Promise<Facility[]>;
  saveFacility(facility: Facility): Promise<void>;
  getVisit(id: string): Promise<Visit | undefined>;
  listVisits(filter?: ListVisitsFilter): Promise<Visit[]>;
  saveVisit(visit: Visit): Promise<void>;
  updateVisit(id: string, updates: Partial<Visit>): Promise<Visit>;

  // Check-in and search operations
  searchVisits(
    query: string,
    facilityId?: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]>;
  checkInVisit(visitId: string, checkInData: CheckInVisitParams): Promise<Visit>;
  saveCheckInEvent(event: CheckInAuditEvent): Promise<void>;
  listCheckInEvents(visitId?: string): Promise<CheckInAuditEvent[]>;

  // Approval and review queue operations
  getVisitsByStatus(
    statuses: VisitStatus | VisitStatus[],
    facilityId?: string,
  ): Promise<Visit[]>;
  saveApprovalRecord(record: ApprovalRecord): Promise<void>;
  listApprovalRecords(visitId?: string): Promise<ApprovalRecord[]>;
  updateVisitStatusWithApproval(
    visitId: string,
    decision: UpdateVisitApprovalParams,
  ): Promise<Visit>;

  // Invitation token management
  createInvitationToken(invitation: InvitationToken): Promise<void>;
  getInvitationToken(token: string): Promise<InvitationToken | undefined>;
  getVisitByInvitationToken(
    token: string,
  ): Promise<{ visit: Visit; token: InvitationToken } | undefined>;
  consumeInvitationToken(
    token: string,
    consumedAtUtc?: string,
  ): Promise<InvitationToken>;

  // Access level management
  listAccessLevels(facilityId?: string): Promise<AccessLevel[]>;
  getAccessLevel(id: string): Promise<AccessLevel | undefined>;
  saveAccessLevel(accessLevel: AccessLevel): Promise<void>;
  deleteAccessLevel(id: string): Promise<void>;

  // Active monitoring, door taps, and check-out
  listActiveVisits(facilityId?: string): Promise<Visit[]>;
  recordDoorTap(tapEvent: DoorTapEvent): Promise<RecordDoorTapResult>;
  listDoorTapEvents(visitId?: string): Promise<DoorTapEvent[]>;
  checkOutVisit(visitId: string, checkOutData: CheckOutVisitParams): Promise<Visit>;
  saveCheckOutEvent(event: CheckOutAuditEvent): Promise<void>;
  listCheckOutEvents(visitId?: string): Promise<CheckOutAuditEvent[]>;
}

export const DEFAULT_FACILITIES: Facility[] = [
  {
    id: "fac-jakarta",
    name: "Jakarta Corporate HQ",
    timezone: "Asia/Jakarta",
    address: "Jl. Jend. Sudirman Kav. 52-53, Senayan, Jakarta Selatan",
    overstayGraceMinutes: 15,
  },
  {
    id: "fac-bali",
    name: "Bali Innovation Center",
    timezone: "Asia/Makassar",
    address: "Jl. Sunset Road No. 88, Kuta, Badung, Bali",
    overstayGraceMinutes: 20,
  },
  {
    id: "fac-jayapura",
    name: "Jayapura Logistics Hub",
    timezone: "Asia/Jayapura",
    address: "Jl. Ahmad Yani No. 10, Gurabesi, Jayapura, Papua",
    overstayGraceMinutes: 30,
  },
];

export const DEFAULT_ACCESS_LEVELS: AccessLevel[] = [
  {
    id: "acc-jkt-lobby",
    facilityId: "fac-jakarta",
    name: "Lobby & 1st Floor Turnstiles",
    description: "Standard ground floor turnstile and visitor reception access",
    doors: ["Lobby Main SpeedGate A", "Lobby Main SpeedGate B", "Visitor Turnstile 01"],
    floors: ["1F"],
    timeScheduleId: 2,
    isDefault: true,
  },
  {
    id: "acc-jkt-exec",
    facilityId: "fac-jakarta",
    name: "Executive Floor 3",
    description: "C-suite suites, boardroom, and VIP meeting lounge",
    doors: ["3F Elevator Lobby Door", "Boardroom East Access"],
    floors: ["3F"],
    timeScheduleId: 2,
    isDefault: false,
  },
  {
    id: "acc-jkt-dc",
    facilityId: "fac-jakarta",
    name: "Technical Datacenter",
    description: "Secured server hall and mission-critical network ops room",
    doors: ["Basement AirLock", "DC Server Room 01"],
    floors: ["B1"],
    timeScheduleId: 1,
    isDefault: false,
  },
  {
    id: "acc-bali-main",
    facilityId: "fac-bali",
    name: "Innovation Hub General Access",
    description: "Co-working space, open lab, and auditorium",
    doors: ["Main Entrance Turnstile", "Lab Wing Sliding Door"],
    floors: ["1F", "2F"],
    timeScheduleId: 2,
    isDefault: true,
  },
  {
    id: "acc-jay-warehouse",
    facilityId: "fac-jayapura",
    name: "Logistics Hub & Warehouse",
    description: "Loading dock, logistics office, and dispatch floor",
    doors: ["Loading Gate 01", "Dispatch Office Door"],
    floors: ["1F"],
    timeScheduleId: 1,
    isDefault: true,
  },
];

export class InMemoryVmsRepository implements IVmsRepository {
  private facilities = new Map<string, Facility>();
  private visits = new Map<string, Visit>();
  private invitationTokens = new Map<string, InvitationToken>();
  private approvalRecords: ApprovalRecord[] = [];
  private accessLevels = new Map<string, AccessLevel>();
  private checkInEvents: CheckInAuditEvent[] = [];
  private doorTapEvents: DoorTapEvent[] = [];
  private checkOutEvents: CheckOutAuditEvent[] = [];

  constructor(
    initialFacilities: Facility[] = DEFAULT_FACILITIES,
    initialAccessLevels: AccessLevel[] = DEFAULT_ACCESS_LEVELS,
  ) {
    for (const f of initialFacilities) {
      this.facilities.set(f.id, structuredClone(f));
    }
    for (const al of initialAccessLevels) {
      this.accessLevels.set(al.id, structuredClone(al));
    }
  }

  async getFacility(id: string): Promise<Facility | undefined> {
    const facility = this.facilities.get(id);
    return facility ? structuredClone(facility) : undefined;
  }

  async listFacilities(): Promise<Facility[]> {
    return Array.from(this.facilities.values()).map((f) => structuredClone(f));
  }

  async saveFacility(facility: Facility): Promise<void> {
    this.facilities.set(facility.id, structuredClone(facility));
  }

  async getVisit(id: string): Promise<Visit | undefined> {
    const visit = this.visits.get(id);
    return visit ? structuredClone(visit) : undefined;
  }

  async listVisits(filter?: ListVisitsFilter): Promise<Visit[]> {
    let list = Array.from(this.visits.values());
    if (filter?.facilityId) {
      list = list.filter((v) => v.facilityId === filter.facilityId);
    }
    if (filter?.status) {
      list = list.filter((v) => v.status === filter.status);
    }
    return list.map((v) => structuredClone(v));
  }

  async saveVisit(visit: Visit): Promise<void> {
    this.visits.set(visit.id, structuredClone(visit));
  }

  async updateVisit(id: string, updates: Partial<Visit>): Promise<Visit> {
    const existing = this.visits.get(id);
    if (!existing) {
      throw new Error(`Visit not found: ${id}`);
    }
    const updated: Visit = {
      ...existing,
      ...updates,
      updatedAtUtc: new Date().toISOString(),
    };
    this.visits.set(id, structuredClone(updated));
    return structuredClone(updated);
  }

  async getVisitsByStatus(
    statuses: VisitStatus | VisitStatus[],
    facilityId?: string,
  ): Promise<Visit[]> {
    const targetStatuses = Array.isArray(statuses) ? statuses : [statuses];
    let list = Array.from(this.visits.values()).filter((v) =>
      targetStatuses.includes(v.status),
    );
    if (facilityId) {
      list = list.filter((v) => v.facilityId === facilityId);
    }
    return list.map((v) => structuredClone(v));
  }

  async saveApprovalRecord(record: ApprovalRecord): Promise<void> {
    this.approvalRecords.push(structuredClone(record));
  }

  async listApprovalRecords(visitId?: string): Promise<ApprovalRecord[]> {
    let list = this.approvalRecords;
    if (visitId) {
      list = list.filter((r) => r.visitId === visitId);
    }
    // Return latest first
    return list
      .map((r) => structuredClone(r))
      .sort(
        (a, b) =>
          new Date(b.decidedAtUtc).getTime() -
          new Date(a.decidedAtUtc).getTime(),
      );
  }

  async updateVisitStatusWithApproval(
    visitId: string,
    decision: UpdateVisitApprovalParams,
  ): Promise<Visit> {
    const existing = this.visits.get(visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${visitId}`);
    }

    await this.saveApprovalRecord(decision.approvalRecord);

    const updated: Visit = {
      ...existing,
      status: decision.newStatus,
      approvalRecord: structuredClone(decision.approvalRecord),
      credentialSyncStatus:
        decision.credentialSyncStatus ?? existing.credentialSyncStatus,
      updatedAtUtc: new Date().toISOString(),
    };
    this.visits.set(visitId, structuredClone(updated));
    return structuredClone(updated);
  }

  async createInvitationToken(invitation: InvitationToken): Promise<void> {
    this.invitationTokens.set(invitation.token, structuredClone(invitation));
  }

  async getInvitationToken(token: string): Promise<InvitationToken | undefined> {
    const record = this.invitationTokens.get(token);
    return record ? structuredClone(record) : undefined;
  }

  async getVisitByInvitationToken(
    token: string,
  ): Promise<{ visit: Visit; token: InvitationToken } | undefined> {
    const tokenRecord = this.invitationTokens.get(token);
    if (!tokenRecord) {
      return undefined;
    }
    const visit = this.visits.get(tokenRecord.visitId);
    if (!visit) {
      return undefined;
    }
    return {
      visit: structuredClone(visit),
      token: structuredClone(tokenRecord),
    };
  }

  async consumeInvitationToken(
    token: string,
    consumedAtUtc?: string,
  ): Promise<InvitationToken> {
    const existing = this.invitationTokens.get(token);
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
    this.invitationTokens.set(token, structuredClone(updated));
    return structuredClone(updated);
  }

  async listAccessLevels(facilityId?: string): Promise<AccessLevel[]> {
    let list = Array.from(this.accessLevels.values());
    if (facilityId) {
      list = list.filter((al) => al.facilityId === facilityId);
    }
    return list.map((al) => structuredClone(al));
  }

  async getAccessLevel(id: string): Promise<AccessLevel | undefined> {
    const level = this.accessLevels.get(id);
    return level ? structuredClone(level) : undefined;
  }

  async saveAccessLevel(accessLevel: AccessLevel): Promise<void> {
    this.accessLevels.set(accessLevel.id, structuredClone(accessLevel));
  }

  async deleteAccessLevel(id: string): Promise<void> {
    this.accessLevels.delete(id);
  }

  async searchVisits(
    query: string,
    facilityId?: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]> {
    let list = Array.from(this.visits.values());

    if (facilityId) {
      list = list.filter((v) => v.facilityId === facilityId);
    }

    if (status) {
      const allowed = Array.isArray(status) ? status : [status];
      list = list.filter((v) => allowed.includes(v.status));
    }

    const q = query.trim().toLowerCase();
    if (!q) {
      return list.map((v) => structuredClone(v));
    }

    return list
      .filter((v) => {
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
      })
      .map((v) => structuredClone(v));
  }

  async checkInVisit(
    visitId: string,
    checkInData: CheckInVisitParams,
  ): Promise<Visit> {
    const existing = this.visits.get(visitId);
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
    await this.saveCheckInEvent(auditEvent);

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

    this.visits.set(visitId, structuredClone(updated));
    return structuredClone(updated);
  }

  async saveCheckInEvent(event: CheckInAuditEvent): Promise<void> {
    this.checkInEvents.push(structuredClone(event));
  }

  async listCheckInEvents(visitId?: string): Promise<CheckInAuditEvent[]> {
    let list = this.checkInEvents;
    if (visitId) {
      list = list.filter((e) => e.visitId === visitId);
    }
    return list
      .map((e) => structuredClone(e))
      .sort(
        (a, b) =>
          new Date(b.checkedInAtUtc).getTime() -
          new Date(a.checkedInAtUtc).getTime(),
      );
  }

  async listActiveVisits(facilityId?: string): Promise<Visit[]> {
    let list = Array.from(this.visits.values()).filter(
      (v) => v.status === "CHECKED_IN",
    );
    if (facilityId) {
      list = list.filter((v) => v.facilityId === facilityId);
    }
    return list.map((v) => structuredClone(v));
  }

  async recordDoorTap(tapEvent: DoorTapEvent): Promise<RecordDoorTapResult> {
    const existing = this.visits.get(tapEvent.visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${tapEvent.visitId}`);
    }

    const eventToStore: DoorTapEvent = {
      ...tapEvent,
      id:
        tapEvent.id ||
        `tap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tappedAtUtc: tapEvent.tappedAtUtc || new Date().toISOString(),
    };
    this.doorTapEvents.push(structuredClone(eventToStore));

    const newTapCount = (existing.tapCount ?? 0) + 1;
    const updatedVisit: Visit = {
      ...existing,
      tapCount: newTapCount,
      updatedAtUtc: new Date().toISOString(),
    };
    this.visits.set(tapEvent.visitId, structuredClone(updatedVisit));

    return {
      event: structuredClone(eventToStore),
      visit: structuredClone(updatedVisit),
      tapCount: newTapCount,
    };
  }

  async listDoorTapEvents(visitId?: string): Promise<DoorTapEvent[]> {
    let list = this.doorTapEvents;
    if (visitId) {
      list = list.filter((e) => e.visitId === visitId);
    }
    return list
      .map((e) => structuredClone(e))
      .sort(
        (a, b) =>
          new Date(b.tappedAtUtc).getTime() -
          new Date(a.tappedAtUtc).getTime(),
      );
  }

  async checkOutVisit(
    visitId: string,
    checkOutData: CheckOutVisitParams,
  ): Promise<Visit> {
    const existing = this.visits.get(visitId);
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
    await this.saveCheckOutEvent(auditEvent);

    const updated: Visit = {
      ...existing,
      status: "CHECKED_OUT",
      actualCheckOutTimeUtc: checkOutData.actualCheckOutTimeUtc,
      checkOutReason: checkOutData.reason,
      isForcedCheckOut: checkOutData.isForced,
      checkedOutByUserId: checkOutData.operatorUserId,
      updatedAtUtc: new Date().toISOString(),
    };

    this.visits.set(visitId, structuredClone(updated));
    return structuredClone(updated);
  }

  async saveCheckOutEvent(event: CheckOutAuditEvent): Promise<void> {
    this.checkOutEvents.push(structuredClone(event));
  }

  async listCheckOutEvents(visitId?: string): Promise<CheckOutAuditEvent[]> {
    let list = this.checkOutEvents;
    if (visitId) {
      list = list.filter((e) => e.visitId === visitId);
    }
    return list
      .map((e) => structuredClone(e))
      .sort(
        (a, b) =>
          new Date(b.checkedOutAtUtc).getTime() -
          new Date(a.checkedOutAtUtc).getTime(),
      );
  }
}

// Global singleton instance for in-memory persistence across API routes in a dev/demo session
const globalForVms = globalThis as unknown as {
  vmsRepository?: InMemoryVmsRepository;
};

export const defaultVmsRepository =
  globalForVms.vmsRepository ?? new InMemoryVmsRepository();

if (process.env.NODE_ENV !== "production") {
  globalForVms.vmsRepository = defaultVmsRepository;
}
