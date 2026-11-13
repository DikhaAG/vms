import type { CredentialSyncStatus, Facility, Visit, VisitStatus } from "./vms-contract";
import type { InvitationToken } from "./invitation-contract";
import type { ApprovalRecord } from "./approval-contract";

export interface ListVisitsFilter {
  facilityId?: string;
  status?: string;
}

export interface UpdateVisitApprovalParams {
  newStatus: VisitStatus;
  approvalRecord: ApprovalRecord;
  credentialSyncStatus?: CredentialSyncStatus;
}

export interface IVmsRepository {
  getFacility(id: string): Promise<Facility | undefined>;
  listFacilities(): Promise<Facility[]>;
  saveFacility(facility: Facility): Promise<void>;
  getVisit(id: string): Promise<Visit | undefined>;
  listVisits(filter?: ListVisitsFilter): Promise<Visit[]>;
  saveVisit(visit: Visit): Promise<void>;
  updateVisit(id: string, updates: Partial<Visit>): Promise<Visit>;

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

export class InMemoryVmsRepository implements IVmsRepository {
  private facilities = new Map<string, Facility>();
  private visits = new Map<string, Visit>();
  private invitationTokens = new Map<string, InvitationToken>();
  private approvalRecords: ApprovalRecord[] = [];

  constructor(initialFacilities: Facility[] = DEFAULT_FACILITIES) {
    for (const f of initialFacilities) {
      this.facilities.set(f.id, structuredClone(f));
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
