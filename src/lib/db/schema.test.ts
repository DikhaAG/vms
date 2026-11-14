import { describe, it, expect } from "vitest";
import {
  facilities,
  facilityDoors,
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
    expect(facilities).toBeDefined();
    expect(facilityDoors).toBeDefined();
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
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS facilities");
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
});
