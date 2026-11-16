import { describe, it, expect } from "vitest";
import {
  systemSettings,
  facilityDoors,
  doors,
  accessLevels,
  hostEmployees,
  visitorProfiles,
  visits,
  invitationTokens,
  approvalRecords,
  checkInAuditEvents,
  doorTapEvents,
  checkOutAuditEvents,
  emergencyAccessGrants,
  hostArrivalNotifications,
  getInitSchemaSql,
} from "./schema";

describe("PostgreSQL Drizzle Schema & DDL Generator", () => {
  it("exports all required relational tables with proper names", () => {
    expect(systemSettings).toBeDefined();
    expect(facilityDoors).toBeDefined();
    expect(doors).toBeDefined();
    expect(accessLevels).toBeDefined();
    expect(hostEmployees).toBeDefined();
    expect(visitorProfiles).toBeDefined();
    expect(visits).toBeDefined();
    expect(invitationTokens).toBeDefined();
    expect(approvalRecords).toBeDefined();
    expect(checkInAuditEvents).toBeDefined();
    expect(doorTapEvents).toBeDefined();
    expect(checkOutAuditEvents).toBeDefined();
    expect(emergencyAccessGrants).toBeDefined();
    expect(hostArrivalNotifications).toBeDefined();
  });

  it("generates idempotent CREATE TABLE IF NOT EXISTS SQL statements for all tables", () => {
    const sql = getInitSchemaSql();
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS system_settings");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS facility_doors");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS access_levels");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS host_employees");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visitor_profiles");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS visits");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS invitation_tokens");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS approval_records");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS check_in_audit_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS door_tap_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS check_out_audit_events");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS emergency_access_grants");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS host_arrival_notifications");
  });

  it("includes the single-site contract migration that purges the Facility entity", () => {
    const sql = getInitSchemaSql();
    // Global site name is backfilled on existing system_settings rows.
    expect(sql).toContain("site_name");
    expect(sql).toContain(
      "ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS site_name",
    );
    // Deprecated facility_id columns are dropped from every owning table.
    expect(sql).toContain("ALTER TABLE visits DROP COLUMN IF EXISTS facility_id");
    expect(sql).toContain(
      "ALTER TABLE access_levels DROP COLUMN IF EXISTS facility_id",
    );
    expect(sql).toContain(
      "ALTER TABLE facility_doors DROP COLUMN IF EXISTS facility_id",
    );
    // The facilities table itself is dropped.
    expect(sql).toContain("DROP TABLE IF EXISTS facilities");
    expect(sql).not.toContain("CREATE TABLE IF NOT EXISTS facilities");
  });

  it("adds region_index_code to a facility_doors table created before door sync stored it", () => {
    const sql = getInitSchemaSql();
    // CREATE TABLE IF NOT EXISTS is a no-op on upgraded databases, so the
    // column needs its own idempotent ALTER or saveDoors fails on first sync.
    expect(sql).toContain(
      "ALTER TABLE facility_doors ADD COLUMN IF NOT EXISTS region_index_code TEXT",
    );
  });

  it("carries the legacy facility's settings into system_settings before dropping facilities", () => {
    const sql = getInitSchemaSql();
    const backfill = sql.indexOf("INSERT INTO system_settings");
    const drop = sql.indexOf("DROP TABLE IF EXISTS facilities");

    expect(backfill).toBeGreaterThan(-1);
    expect(backfill).toBeLessThan(drop);
    // Only runs when the legacy table is still present (fresh installs skip it)…
    expect(sql).toContain("to_regclass('public.facilities')");
    // …copies the operator-configured values, not the defaults…
    expect(sql).toMatch(/f\.timezone/);
    expect(sql).toMatch(/f\.overstay_grace_minutes/);
    // …and never overwrites settings an operator already saved.
    expect(sql).toContain("ON CONFLICT (id) DO NOTHING");
  });
});

