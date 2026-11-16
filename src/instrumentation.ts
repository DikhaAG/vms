/**
 * Next.js startup hook: ensures the PostgreSQL schema exists before the VMS
 * serves requests (ADR 0006). `initPostgresDb` is idempotent
 * (CREATE TABLE IF NOT EXISTS + safe single-site migrations), so it is safe on
 * every boot. Fails fast when DATABASE_URL is missing or the database is down.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { initPostgresDb } = await import("@/lib/db/client");
  const result = await initPostgresDb();

  if (!result.ok) {
    throw new Error(`PostgreSQL schema initialization failed: ${result.error}`);
  }
}
