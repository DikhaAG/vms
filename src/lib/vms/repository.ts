import type {
  CredentialSyncStatus,
  HikCentralVisitReference,
  HostEmployee,
  SystemSettings,
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
  EmergencyAccessGrant,
  FacilityDoor,
  HostArrivalNotification,
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

import { PostgresVmsRepository } from "./postgres-repository";
export { PostgresVmsRepository } from "./postgres-repository";

// Global singleton instance for repository persistence across API routes
const globalForVms = globalThis as unknown as {
  vmsRepository?: IVmsRepository;
};

/**
 * The application always persists to PostgreSQL (ADR 0006). There is no
 * in-memory fallback: a missing DATABASE_URL fails on the first query.
 */
export function createVmsRepository(): IVmsRepository {
  return new PostgresVmsRepository();
}

export const defaultVmsRepository: IVmsRepository =
  globalForVms.vmsRepository ?? createVmsRepository();

if (process.env.NODE_ENV !== "production") {
  globalForVms.vmsRepository = defaultVmsRepository;
}
