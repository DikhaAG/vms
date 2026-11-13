import type { Facility, Visit } from "./vms-contract";

export interface ListVisitsFilter {
  facilityId?: string;
  status?: string;
}

export interface IVmsRepository {
  getFacility(id: string): Promise<Facility | undefined>;
  listFacilities(): Promise<Facility[]>;
  saveFacility(facility: Facility): Promise<void>;
  getVisit(id: string): Promise<Visit | undefined>;
  listVisits(filter?: ListVisitsFilter): Promise<Visit[]>;
  saveVisit(visit: Visit): Promise<void>;
  updateVisit(id: string, updates: Partial<Visit>): Promise<Visit>;
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
