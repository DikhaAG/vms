import { PostgresVmsRepository } from "./postgres-repository";

// Global singleton instance for repository persistence across API routes
const globalForVms = globalThis as unknown as {
  vmsRepository?: PostgresVmsRepository;
};

/**
 * The application always persists to PostgreSQL (ADR 0006). There is no
 * in-memory fallback: a missing DATABASE_URL fails on the first query.
 */
export function createVmsRepository(): PostgresVmsRepository {
  return new PostgresVmsRepository();
}

export const defaultVmsRepository: PostgresVmsRepository =
  globalForVms.vmsRepository ?? createVmsRepository();

if (process.env.NODE_ENV !== "production") {
  globalForVms.vmsRepository = defaultVmsRepository;
}
