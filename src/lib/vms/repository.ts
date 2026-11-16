import type {
  CredentialSyncStatus,
  HikCentralVisitReference,
  HostEmployee,
  SystemSettings,
  Visit,
  VisitStatus,
} from "./vms-contract";
import { DEFAULT_SYSTEM_SETTINGS } from "./vms-contract";
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
  EmergencyAccessGrant,
  FacilityDoor,
  HostArrivalNotification,
  VisitLastSeenDoor,
} from "./checkout-contract";
import type { VisitorProfile } from "./group-contract";

export interface ListVisitsFilter {
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
  // Global system settings (Single-Site Architecture)
  getSettings(): Promise<SystemSettings>;
  updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings>;

  getVisit(id: string): Promise<Visit | undefined>;
  listVisits(filter?: ListVisitsFilter): Promise<Visit[]>;
  saveVisit(visit: Visit): Promise<void>;
  updateVisit(id: string, updates: Partial<Visit>): Promise<Visit>;

  // Check-in and search operations
  searchVisits(
    query: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]>;
  checkInVisit(visitId: string, checkInData: CheckInVisitParams): Promise<Visit>;
  saveCheckInEvent(event: CheckInAuditEvent): Promise<void>;
  listCheckInEvents(visitId?: string): Promise<CheckInAuditEvent[]>;

  // Approval and review queue operations
  getVisitsByStatus(
    statuses: VisitStatus | VisitStatus[],
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
  listAccessLevels(): Promise<AccessLevel[]>;
  getAccessLevel(id: string): Promise<AccessLevel | undefined>;
  saveAccessLevel(accessLevel: AccessLevel): Promise<void>;
  saveAccessLevels(accessLevels: AccessLevel[]): Promise<void>;
  deleteAccessLevel(id: string): Promise<void>;

  // Active monitoring, door taps, and check-out
  listActiveVisits(): Promise<Visit[]>;
  recordDoorTap(tapEvent: DoorTapEvent): Promise<RecordDoorTapResult>;
  listDoorTapEvents(visitId?: string): Promise<DoorTapEvent[]>;
  checkOutVisit(visitId: string, checkOutData: CheckOutVisitParams): Promise<Visit>;
  saveCheckOutEvent(event: CheckOutAuditEvent): Promise<void>;
  listCheckOutEvents(visitId?: string): Promise<CheckOutAuditEvent[]>;

  // Emergency access escalation operations
  saveEmergencyGrant(grant: EmergencyAccessGrant): Promise<void>;
  getEmergencyGrants(visitId?: string): Promise<EmergencyAccessGrant[]>;
  revokeEmergencyGrant(
    grantId: string,
    operatorUserId: string,
    operatorName?: string,
  ): Promise<EmergencyAccessGrant>;

  // Facility door topology operations
  getDoor(doorIndexCode: string): Promise<FacilityDoor | undefined>;
  getDoorByName(doorName: string): Promise<FacilityDoor | undefined>;
  findDoor(codeOrName: string): Promise<FacilityDoor | undefined>;
  listDoors(): Promise<FacilityDoor[]>;
  saveDoor(door: FacilityDoor): Promise<void>;
  saveDoors(doors: FacilityDoor[]): Promise<void>;

  // Group visits and visitor profile management
  findVisitorProfileByCertificate(
    certificateNo: string,
  ): Promise<VisitorProfile | undefined>;
  getVisitorProfile(id: string): Promise<VisitorProfile | undefined>;
  saveVisitorProfile(profile: VisitorProfile): Promise<void>;
  softDeleteVisitorProfile(
    id: string,
    isDeleted: boolean,
    reason?: string,
  ): Promise<VisitorProfile>;
  listVisitorProfiles(options?: {
    includeDeleted?: boolean;
    query?: string;
  }): Promise<VisitorProfile[]>;
  listVisitsByGroup(groupId: string): Promise<Visit[]>;

  // Host employee directory operations
  saveHost(host: HostEmployee): Promise<void>;
  saveHosts(hosts: HostEmployee[]): Promise<void>;
  listHosts(query?: string): Promise<HostEmployee[]>;
  getHost(id: string): Promise<HostEmployee | undefined>;

  // Host arrival notifications & touchless auto check-in (Ticket 02)
  saveHostNotification(notification: HostArrivalNotification): Promise<void>;
  listHostNotifications(hostId?: string, visitId?: string): Promise<HostArrivalNotification[]>;
  autoCheckInVisit(params: {
    visitId: string;
    actualCheckInTimeUtc: string;
    tapEvent: DoorTapEvent;
    hostNotification?: HostArrivalNotification;
  }): Promise<{ visit: Visit; event: DoorTapEvent; notification?: HostArrivalNotification }>;
}

export const DEFAULT_ACCESS_LEVELS: AccessLevel[] = [];

export const TEST_FIXTURE_ACCESS_LEVELS: AccessLevel[] = [
  {
    id: "acc-jkt-lobby",
    name: "Lobby & 1st Floor Turnstiles",
    description: "Standard ground floor turnstile and visitor reception access",
    doors: ["Lobby Main SpeedGate A", "Lobby Main SpeedGate B", "Visitor Turnstile 01"],
    floors: ["1F"],
    timeScheduleId: 2,
    isDefault: true,
  },
  {
    id: "acc-jkt-exec",
    name: "Executive Floor 3",
    description: "C-suite suites, boardroom, and VIP meeting lounge",
    doors: ["3F Elevator Lobby Door", "Boardroom East Access"],
    floors: ["3F"],
    timeScheduleId: 2,
    isDefault: false,
  },
  {
    id: "acc-jkt-dc",
    name: "Technical Datacenter",
    description: "Secured server hall and mission-critical network ops room",
    doors: ["Basement AirLock", "DC Server Room 01"],
    floors: ["B1"],
    timeScheduleId: 1,
    isDefault: false,
  },
  {
    id: "acc-bali-main",
    name: "Innovation Hub General Access",
    description: "Co-working space, open lab, and auditorium",
    doors: ["Main Entrance Turnstile", "Lab Wing Sliding Door"],
    floors: ["1F", "2F"],
    timeScheduleId: 2,
    isDefault: true,
  },
  {
    id: "acc-jay-warehouse",
    name: "Logistics Hub & Warehouse",
    description: "Loading dock, logistics office, and dispatch floor",
    doors: ["Loading Gate 01", "Dispatch Office Door"],
    floors: ["1F"],
    timeScheduleId: 1,
    isDefault: true,
  },
];

export const DEFAULT_VISITOR_PROFILES: VisitorProfile[] = [];

export const TEST_FIXTURE_VISITOR_PROFILES: VisitorProfile[] = [
  {
    id: "prof-ktp-3171",
    certificateType: 111,
    certificateNo: "3171012345670001",
    fullName: "Kenji Tanaka",
    familyName: "Tanaka",
    givenName: "Kenji",
    phone: "+628111222333",
    email: "kenji@example.com",
    facePhoto: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    isDeleted: false,
    createdAtUtc: "2026-11-01T08:00:00.000Z",
    updatedAtUtc: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "prof-ktp-3275",
    certificateType: 111,
    certificateNo: "3275098765430002",
    fullName: "Dewi Lestari",
    familyName: "Lestari",
    givenName: "Dewi",
    phone: "+628123456789",
    email: "dewi.lestari@example.com",
    facePhoto: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    isDeleted: false,
    createdAtUtc: "2026-11-05T09:00:00.000Z",
    updatedAtUtc: "2026-11-05T09:00:00.000Z",
  },
];

export const DEFAULT_HOSTS: HostEmployee[] = [
  {
    id: "emp-101",
    personCode: "emp-101",
    name: "Budi Santoso",
    email: "budi.santoso@example.com",
    phone: "+628123456789",
    orgIndexCode: "org-dept-engineering",
    departmentName: "Engineering",
  },
  {
    id: "emp-102",
    personCode: "emp-102",
    name: "Siti Rahma",
    email: "siti.rahma@example.com",
    phone: "+628198765432",
    orgIndexCode: "org-dept-hr",
    departmentName: "Human Resources",
  },
  {
    id: "emp-host-01",
    personCode: "emp-host-01",
    name: "Rudi Host",
    email: "rudi.host@example.com",
    phone: "+628111222333",
    orgIndexCode: "org-dept-operations",
    departmentName: "Operations",
  },
];

export const TEST_FIXTURE_DOORS: FacilityDoor[] = [
  // Jakarta Corporate HQ
  {
    id: "door-jkt-turnstile-1",
    doorIndexCode: "door-turnstile-1",
    doorName: "Lobby Main SpeedGate A",
    accessType: "DUAL_DIRECTION",
    isPerimeter: true,
  },
  {
    id: "door-jkt-turnstile-lobby",
    doorIndexCode: "door-turnstile-lobby",
    doorName: "Lobby Main SpeedGate B",
    accessType: "DUAL_DIRECTION",
    isPerimeter: true,
  },
  {
    id: "door-jkt-turnstile-main",
    doorIndexCode: "door-turnstile-main",
    doorName: "Visitor Turnstile 01",
    accessType: "DUAL_DIRECTION",
    isPerimeter: true,
  },
  {
    id: "door-jkt-3f-lobby",
    doorIndexCode: "door-jkt-3f-el",
    doorName: "3F Elevator Lobby Door",
    accessType: "DUAL_DIRECTION",
    isPerimeter: false,
  },
  {
    id: "door-jkt-boardroom",
    doorIndexCode: "door-jkt-br-east",
    doorName: "Boardroom East Access",
    accessType: "SINGLE_DIRECTION_IN",
    isPerimeter: false,
    roomTimeoutMinutes: 60,
  },
  {
    id: "door-jkt-basement-airlock",
    doorIndexCode: "door-jkt-b1-al",
    doorName: "Basement AirLock",
    accessType: "DUAL_DIRECTION",
    isPerimeter: false,
  },
  {
    id: "door-jkt-dc-server-01",
    doorIndexCode: "door-jkt-dc-01",
    doorName: "DC Server Room 01",
    accessType: "SINGLE_DIRECTION_IN",
    isPerimeter: false,
    roomTimeoutMinutes: 120,
  },
  // Bali Innovation Center
  {
    id: "door-bali-main-entrance",
    doorIndexCode: "door-bali-main",
    doorName: "Main Entrance Turnstile",
    accessType: "DUAL_DIRECTION",
    isPerimeter: true,
  },
  {
    id: "door-bali-lab-sliding",
    doorIndexCode: "door-bali-lab",
    doorName: "Lab Wing Sliding Door",
    accessType: "SINGLE_DIRECTION_IN",
    isPerimeter: false,
    roomTimeoutMinutes: 90,
  },
  // Jayapura Logistics Hub
  {
    id: "door-jay-gate-1",
    doorIndexCode: "door-gate-1",
    doorName: "Loading Gate 01",
    accessType: "DUAL_DIRECTION",
    isPerimeter: true,
  },
  {
    id: "door-jay-dispatch-door",
    doorIndexCode: "door-jay-dispatch",
    doorName: "Dispatch Office Door",
    accessType: "SINGLE_DIRECTION_IN",
    isPerimeter: false,
    roomTimeoutMinutes: 45,
  },
  // Generic test door
  {
    id: "door-generic-1",
    doorIndexCode: "door-1",
    doorName: "Door 1",
    accessType: "DUAL_DIRECTION",
    isPerimeter: false,
  },
];

export const DEFAULT_DOORS: FacilityDoor[] = [];

export class InMemoryVmsRepository implements IVmsRepository {
  private visits = new Map<string, Visit>();
  private invitationTokens = new Map<string, InvitationToken>();
  private approvalRecords: ApprovalRecord[] = [];
  private accessLevels = new Map<string, AccessLevel>();
  private checkInEvents: CheckInAuditEvent[] = [];
  private doorTapEvents: DoorTapEvent[] = [];
  private checkOutEvents: CheckOutAuditEvent[] = [];
  private visitorProfiles = new Map<string, VisitorProfile>();
  private hosts = new Map<string, HostEmployee>();
  private doors = new Map<string, FacilityDoor>();
  private emergencyGrants = new Map<string, EmergencyAccessGrant>();
  private hostNotifications: HostArrivalNotification[] = [];
  private systemSettings: SystemSettings = {
    id: "default",
    siteName: DEFAULT_SYSTEM_SETTINGS.siteName,
    timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
    overstayGraceMinutes: DEFAULT_SYSTEM_SETTINGS.overstayGraceMinutes,
    autoCheckInEarlyBufferMinutes: DEFAULT_SYSTEM_SETTINGS.autoCheckInEarlyBufferMinutes,
    updatedAt: new Date().toISOString(),
  };

  constructor(
    initialAccessLevels: AccessLevel[] = DEFAULT_ACCESS_LEVELS,
    initialVisitorProfiles: VisitorProfile[] = DEFAULT_VISITOR_PROFILES,
    initialHosts: HostEmployee[] = DEFAULT_HOSTS,
    initialDoors: FacilityDoor[] = DEFAULT_DOORS,
    initialSettings?: SystemSettings,
  ) {
    if (initialSettings) {
      this.systemSettings = structuredClone(initialSettings);
    }
    for (const al of initialAccessLevels) {
      this.accessLevels.set(al.id, structuredClone(al));
    }
    for (const p of initialVisitorProfiles) {
      this.visitorProfiles.set(p.id, structuredClone(p));
    }
    for (const h of initialHosts) {
      this.hosts.set(h.id, structuredClone(h));
    }
    for (const d of initialDoors) {
      this.doors.set(d.doorIndexCode, structuredClone(d));
    }
  }

  // 0. Global System Settings (Single-Site Architecture)
  async getSettings(): Promise<SystemSettings> {
    return structuredClone(this.systemSettings);
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    this.systemSettings = {
      ...this.systemSettings,
      ...cleanedUpdates,
      id: "default",
      updatedAt: new Date().toISOString(),
    };
    return structuredClone(this.systemSettings);
  }

  private enrichVisitEmergencyGrants(visit: Visit): void {
    const now = Date.now();
    const activeGrants = Array.from(this.emergencyGrants.values()).filter((g) => {
      if (g.visitId !== visit.id) return false;
      if (g.status === "ACTIVE") {
        if (new Date(g.expiresAtUtc).getTime() <= now) {
          g.status = "EXPIRED";
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
    const visit = this.visits.get(id);
    if (!visit) return undefined;
    const cloned = structuredClone(visit);
    this.enrichVisitEmergencyGrants(cloned);
    return cloned;
  }

  async listVisits(filter?: ListVisitsFilter): Promise<Visit[]> {
    let list = Array.from(this.visits.values());
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
  ): Promise<Visit[]> {
    const targetStatuses = Array.isArray(statuses) ? statuses : [statuses];
    const list = Array.from(this.visits.values()).filter((v) =>
      targetStatuses.includes(v.status),
    );
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

  async listAccessLevels(): Promise<AccessLevel[]> {
    const list = Array.from(this.accessLevels.values());
    return list.map((al) => structuredClone(al));
  }

  async getAccessLevel(id: string): Promise<AccessLevel | undefined> {
    const level = this.accessLevels.get(id);
    return level ? structuredClone(level) : undefined;
  }

  async saveAccessLevel(accessLevel: AccessLevel): Promise<void> {
    this.accessLevels.set(accessLevel.id, structuredClone(accessLevel));
  }

  async saveAccessLevels(accessLevels: AccessLevel[]): Promise<void> {
    for (const al of accessLevels) {
      this.accessLevels.set(al.id, structuredClone(al));
    }
  }

  async deleteAccessLevel(id: string): Promise<void> {
    this.accessLevels.delete(id);
  }

  async searchVisits(
    query: string,
    status?: VisitStatus | VisitStatus[],
  ): Promise<Visit[]> {
    let list = Array.from(this.visits.values());

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

  async listActiveVisits(): Promise<Visit[]> {
    const list = Array.from(this.visits.values()).filter(
      (v) => v.status === "CHECKED_IN" || v.status === "OVERSTAY",
    );
    return list.map((v) => {
      const cloned = structuredClone(v);
      this.enrichVisitEmergencyGrants(cloned);
      return cloned;
    });
  }

  async recordDoorTap(tapEvent: DoorTapEvent): Promise<RecordDoorTapResult> {
    const existing = this.visits.get(tapEvent.visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${tapEvent.visitId}`);
    }

    const isImplicit = Boolean(tapEvent.isImplicit || tapEvent.implicit);
    const direction = tapEvent.direction ?? "in";
    const inAndOutType = tapEvent.inAndOutType ?? (direction === "in" ? 1 : 2);

    // Idempotency: if duplicate tap with same ID or identical timestamp+door+direction was already recorded
    const existingTap = this.doorTapEvents.find(
      (e) =>
        e.visitId === tapEvent.visitId &&
        ((tapEvent.id && e.id === tapEvent.id) ||
          (tapEvent.tappedAtUtc &&
            e.tappedAtUtc === tapEvent.tappedAtUtc &&
            e.doorIndexCode === tapEvent.doorIndexCode &&
            e.direction === direction)),
    );
    if (existingTap) {
      return {
        event: structuredClone(existingTap),
        visit: structuredClone(existing),
        tapCount: existing.tapCount ?? 0,
      };
    }

    // Auto-enrich door metadata if available
    const door =
      this.doors.get(tapEvent.doorIndexCode) ||
      Array.from(this.doors.values()).find(
        (d) =>
          tapEvent.doorName &&
          d.doorName.toLowerCase() === tapEvent.doorName.toLowerCase(),
      );

    const doorName = tapEvent.doorName ?? door?.doorName;
    const isPerimeter = tapEvent.isPerimeter ?? door?.isPerimeter ?? false;

    const eventToStore: DoorTapEvent = {
      ...tapEvent,
      id:
        tapEvent.id ||
        `tap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tappedAtUtc: tapEvent.tappedAtUtc || new Date().toISOString(),
      direction,
      doorName,
      inAndOutType,
      isPerimeter,
      isImplicit: isImplicit || undefined,
      implicit: isImplicit || undefined,
      transitionNote: tapEvent.transitionNote,
    };
    this.doorTapEvents.push(structuredClone(eventToStore));

    // Implicit taps do not increment tapCount against the visitor's tap quota
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

  async saveEmergencyGrant(grant: EmergencyAccessGrant): Promise<void> {
    this.emergencyGrants.set(grant.id, structuredClone(grant));
    const visit = this.visits.get(grant.visitId);
    if (visit) {
      this.enrichVisitEmergencyGrants(visit);
    }
  }

  async getEmergencyGrants(visitId?: string): Promise<EmergencyAccessGrant[]> {
    let list = Array.from(this.emergencyGrants.values());
    if (visitId) {
      list = list.filter((g) => g.visitId === visitId);
    }
    return list
      .map((g) => structuredClone(g))
      .sort(
        (a, b) =>
          new Date(b.grantedAtUtc).getTime() -
          new Date(a.grantedAtUtc).getTime(),
      );
  }

  async revokeEmergencyGrant(
    grantId: string,
    operatorUserId: string,
    operatorName?: string,
  ): Promise<EmergencyAccessGrant> {
    const grant = this.emergencyGrants.get(grantId);
    if (!grant) {
      throw new Error(`Emergency grant not found: ${grantId}`);
    }

    const updated: EmergencyAccessGrant = {
      ...grant,
      status: "REVOKED",
      revokedAtUtc: new Date().toISOString(),
      revokedByUserId: operatorUserId,
      revokedByName: operatorName,
    };

    this.emergencyGrants.set(grantId, structuredClone(updated));
    const visit = this.visits.get(updated.visitId);
    if (visit) {
      this.enrichVisitEmergencyGrants(visit);
    }

    return structuredClone(updated);
  }

  async findVisitorProfileByCertificate(
    certificateNo: string,
  ): Promise<VisitorProfile | undefined> {
    const trimmed = certificateNo.trim();
    for (const profile of this.visitorProfiles.values()) {
      if (profile.certificateNo === trimmed && !profile.isDeleted) {
        return structuredClone(profile);
      }
    }
    return undefined;
  }

  async getVisitorProfile(id: string): Promise<VisitorProfile | undefined> {
    const profile = this.visitorProfiles.get(id);
    return profile ? structuredClone(profile) : undefined;
  }

  async saveVisitorProfile(profile: VisitorProfile): Promise<void> {
    // Remove any existing entry with the same certificate number to avoid duplicates
    for (const [id, existing] of this.visitorProfiles.entries()) {
      if (
        existing.certificateNo === profile.certificateNo &&
        id !== profile.id
      ) {
        this.visitorProfiles.delete(id);
      }
    }
    this.visitorProfiles.set(profile.id, structuredClone(profile));
  }

  async softDeleteVisitorProfile(
    id: string,
    isDeleted: boolean,
    reason?: string,
  ): Promise<VisitorProfile> {
    const existing = this.visitorProfiles.get(id);
    if (!existing) {
      throw new Error(`Visitor profile not found: ${id}`);
    }

    const updated: VisitorProfile = {
      ...existing,
      isDeleted,
      deletionReason: isDeleted ? reason : undefined,
      deletedAtUtc: isDeleted ? new Date().toISOString() : undefined,
      updatedAtUtc: new Date().toISOString(),
    };

    this.visitorProfiles.set(id, structuredClone(updated));
    return structuredClone(updated);
  }

  async listVisitorProfiles(options?: {
    includeDeleted?: boolean;
    query?: string;
  }): Promise<VisitorProfile[]> {
    let list = Array.from(this.visitorProfiles.values());

    if (!options?.includeDeleted) {
      list = list.filter((p) => !p.isDeleted);
    }

    if (options?.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.certificateNo.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)),
      );
    }

    const allVisits = Array.from(this.visits.values());
    return list.map((p) => {
      const cloned = structuredClone(p);
      cloned.visitCount = allVisits.filter(
        (v) => v.certificateNo === p.certificateNo,
      ).length;
      return cloned;
    });
  }

  async listVisitsByGroup(groupId: string): Promise<Visit[]> {
    const visits = Array.from(this.visits.values()).filter(
      (v) => v.groupId === groupId,
    );
    return visits.map((v) => structuredClone(v));
  }

  async saveHost(host: HostEmployee): Promise<void> {
    this.hosts.set(host.id, structuredClone(host));
  }

  async saveHosts(hosts: HostEmployee[]): Promise<void> {
    for (const host of hosts) {
      this.hosts.set(host.id, structuredClone(host));
    }
  }

  async getHost(id: string): Promise<HostEmployee | undefined> {
    const host = this.hosts.get(id);
    return host ? structuredClone(host) : undefined;
  }

  async listHosts(query?: string): Promise<HostEmployee[]> {
    let list = Array.from(this.hosts.values());
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.id.toLowerCase().includes(q) ||
          (h.email && h.email.toLowerCase().includes(q)) ||
          (h.personCode && h.personCode.toLowerCase().includes(q)),
      );
    }
    return list.map((h) => structuredClone(h));
  }

  async getDoor(doorIndexCode: string): Promise<FacilityDoor | undefined> {
    const door = this.doors.get(doorIndexCode);
    return door ? structuredClone(door) : undefined;
  }

  async getDoorByName(doorName: string): Promise<FacilityDoor | undefined> {
    const lower = doorName.trim().toLowerCase();
    for (const door of this.doors.values()) {
      if (door.doorName.toLowerCase() === lower) {
        return structuredClone(door);
      }
    }
    return undefined;
  }

  async findDoor(codeOrName: string): Promise<FacilityDoor | undefined> {
    const byCode = this.doors.get(codeOrName);
    if (byCode) {
      return structuredClone(byCode);
    }
    return this.getDoorByName(codeOrName);
  }

  async listDoors(): Promise<FacilityDoor[]> {
    return Array.from(this.doors.values()).map((d) => structuredClone(d));
  }

  async saveDoor(door: FacilityDoor): Promise<void> {
    this.doors.set(door.doorIndexCode, structuredClone(door));
  }

  async saveDoors(doors: FacilityDoor[]): Promise<void> {
    for (const d of doors) {
      this.doors.set(d.doorIndexCode, structuredClone(d));
    }
  }

  async saveHostNotification(
    notification: HostArrivalNotification,
  ): Promise<void> {
    this.hostNotifications.push(structuredClone(notification));
  }

  async listHostNotifications(
    hostId?: string,
    visitId?: string,
  ): Promise<HostArrivalNotification[]> {
    let list = this.hostNotifications;
    if (hostId) {
      list = list.filter((n) => n.hostId === hostId);
    }
    if (visitId) {
      list = list.filter((n) => n.visitId === visitId);
    }
    return list
      .map((n) => structuredClone(n))
      .sort(
        (a, b) =>
          new Date(b.createdAtUtc).getTime() -
          new Date(a.createdAtUtc).getTime(),
      );
  }

  async autoCheckInVisit(params: {
    visitId: string;
    actualCheckInTimeUtc: string;
    tapEvent: DoorTapEvent;
    hostNotification?: HostArrivalNotification;
  }): Promise<{
    visit: Visit;
    event: DoorTapEvent;
    notification?: HostArrivalNotification;
  }> {
    const existing = this.visits.get(params.visitId);
    if (!existing) {
      throw new Error(`Visit not found: ${params.visitId}`);
    }

    // Idempotency: if visit is already checked in, do not re-check in or overwrite actualCheckInTimeUtc
    if (existing.status === "CHECKED_IN" || existing.status === "OVERSTAY") {
      const existingTaps = this.doorTapEvents.filter((e) => e.visitId === params.visitId);
      const match = params.tapEvent.id
        ? existingTaps.find((e) => e.id === params.tapEvent.id)
        : existingTaps[0];
      return {
        visit: structuredClone(existing),
        event: match ? structuredClone(match) : structuredClone(params.tapEvent),
        notification: params.hostNotification ? structuredClone(params.hostNotification) : undefined,
      };
    }

    const door =
      this.doors.get(params.tapEvent.doorIndexCode) ||
      Array.from(this.doors.values()).find(
        (d) =>
          params.tapEvent.doorName &&
          d.doorName.toLowerCase() === params.tapEvent.doorName.toLowerCase(),
      );

    const doorName = params.tapEvent.doorName ?? door?.doorName;
    const isPerimeter =
      params.tapEvent.isPerimeter ?? door?.isPerimeter ?? true;

    const eventToStore: DoorTapEvent = {
      ...params.tapEvent,
      id:
        params.tapEvent.id ||
        `tap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tappedAtUtc: params.tapEvent.tappedAtUtc || params.actualCheckInTimeUtc,
      direction: "in",
      doorName,
      inAndOutType: 1,
      isPerimeter,
    };
    this.doorTapEvents.push(structuredClone(eventToStore));

    if (params.hostNotification) {
      await this.saveHostNotification(params.hostNotification);
    }

    const auditEvent: CheckInAuditEvent = {
      id: `chk-audit-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      visitId: params.visitId,
      checkedInAtUtc: params.actualCheckInTimeUtc,
      receptionistUserId: "system-auto-checkin",
      receptionistName: "Touchless Perimeter Fast-Track",
      verificationMethod: "biometric",
      notes: `Touchless auto check-in on perimeter door tap: ${doorName || params.tapEvent.doorIndexCode}`,
    };
    await this.saveCheckInEvent(auditEvent);

    const updatedLastSeenDoor: VisitLastSeenDoor = {
      doorIndexCode: eventToStore.doorIndexCode,
      doorName: eventToStore.doorName,
      tappedAtUtc: eventToStore.tappedAtUtc,
      direction: "in",
      accessType: door?.accessType,
      isPerimeter,
    };

    const updatedVisit: Visit = {
      ...existing,
      status: "CHECKED_IN",
      actualCheckInTimeUtc: params.actualCheckInTimeUtc,
      tapCount: 1,
      lastSeenDoor: updatedLastSeenDoor,
      isFastTrack: true,
      updatedAtUtc: new Date().toISOString(),
    };
    this.visits.set(params.visitId, structuredClone(updatedVisit));

    return {
      visit: structuredClone(updatedVisit),
      event: structuredClone(eventToStore),
      notification: params.hostNotification
        ? structuredClone(params.hostNotification)
        : undefined,
    };
  }
}

import { PostgresVmsRepository } from "./postgres-repository";
export { PostgresVmsRepository } from "./postgres-repository";

// Global singleton instance for repository persistence across API routes
const globalForVms = globalThis as unknown as {
  vmsRepository?: IVmsRepository;
};

export function createVmsRepository(): IVmsRepository {
  if (process.env.DATABASE_URL) {
    return new PostgresVmsRepository();
  }
  return new InMemoryVmsRepository();
}

export const defaultVmsRepository: IVmsRepository =
  globalForVms.vmsRepository ?? createVmsRepository();

if (process.env.NODE_ENV !== "production") {
  globalForVms.vmsRepository = defaultVmsRepository;
}
