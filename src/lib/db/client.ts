import { Pool, type PoolConfig } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type VmsDatabase = NodePgDatabase<typeof schema>;

export interface PostgresClientOptions {
  connectionString?: string;
  pool?: Pool;
  poolConfig?: PoolConfig;
}

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  vmsDb?: VmsDatabase;
};

/**
 * Creates or retrieves the singleton pg.Pool.
 */
export function getOrCreatePool(options?: PostgresClientOptions): Pool {
  if (options?.pool) {
    return options.pool;
  }

  if (globalForDb.pgPool) {
    return globalForDb.pgPool;
  }

  const connectionString =
    options?.connectionString ||
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/vms_db";

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...options?.poolConfig,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgPool = pool;
  }

  return pool;
}

/**
 * Creates a Drizzle ORM client over a PostgreSQL pool.
 */
export function createPostgresClient(
  options?: PostgresClientOptions,
): VmsDatabase {
  if (options?.pool) {
    return drizzle(options.pool, { schema });
  }

  if (globalForDb.vmsDb) {
    return globalForDb.vmsDb;
  }

  const pool = getOrCreatePool(options);
  const db = drizzle(pool, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.vmsDb = db;
  }

  return db;
}

export interface InitDbResult {
  ok: boolean;
  error?: string;
}

/**
 * Initializes the PostgreSQL schema with idempotent CREATE TABLE IF NOT EXISTS statements.
 */
export async function initPostgresDb(pool?: Pool): Promise<InitDbResult> {
  const activePool = pool ?? getOrCreatePool();
  try {
    const sql = schema.getInitSchemaSql();
    await activePool.query(sql);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database initialization error";
    return { ok: false, error: message };
  }
}

