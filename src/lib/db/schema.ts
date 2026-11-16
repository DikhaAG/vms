import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import type { HostEmployee, Visit, SystemSettings } from "../vms/vms-contract";
import type { FacilityDoor, DoorTapEvent, CheckOutAuditEvent, EmergencyAccessGrant, HostArrivalNotification } from "../vms/checkout-contract";
import type { AccessLevel } from "../vms/access-level-contract";
import type { VisitorProfile } from "../vms/group-contract";
import type { InvitationToken } from "../vms/invitation-contract";
import type { ApprovalRecord } from "../vms/approval-contract";
import type { CheckInAuditEvent } from "../vms/checkin-contract";

// 0. Global System Settings (Single-Site Architecture)
export const systemSettings = pgTable("system_settings", {
  id: text("id").primaryKey(), // constant singleton "default"
  siteName: text("site_name").notNull().default("Gedung Utama"),
  timezone: text("timezone").notNull().default("Asia/Jakarta"),
  overstayGraceMinutes: integer("overstay_grace_minutes").notNull().default(15),
  autoCheckInEarlyBufferMinutes: integer("auto_check_in_early_buffer_minutes").notNull().default(15),
  updatedAt: text("updated_at").notNull(),
  data: jsonb("data").$type<SystemSettings>().notNull(),
});

// 1. Doors (flat, site-wide; physical table keeps its legacy name)
export const facilityDoors = pgTable("facility_doors", {
  doorIndexCode: text("door_index_code").primaryKey(),
  regionIndexCode: text("region_index_code"),
  doorName: text("door_name").notNull(),
  isPerimeter: boolean("is_perimeter").notNull().default(false),
  data: jsonb("data").$type<FacilityDoor>().notNull(),
});

export const doors = facilityDoors;

// 3. Access Levels
export const accessLevels = pgTable("access_levels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  data: jsonb("data").$type<AccessLevel>().notNull(),
});

// 4. Host Employees
export const hostEmployees = pgTable("host_employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  data: jsonb("data").$type<HostEmployee>().notNull(),
});

// 5. Visitor Profiles
export const visitorProfiles = pgTable("visitor_profiles", {
  id: text("id").primaryKey(),
  certificateNo: text("certificate_no").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  data: jsonb("data").$type<VisitorProfile>().notNull(),
});

// 6. Visits
export const visits = pgTable("visits", {
  id: text("id").primaryKey(),
  status: text("status").notNull(),
  createdAtUtc: text("created_at_utc").notNull(),
  data: jsonb("data").$type<Visit>().notNull(),
});

// 7. Invitation Tokens
export const invitationTokens = pgTable("invitation_tokens", {
  token: text("token").primaryKey(),
  visitId: text("visit_id").notNull(),
  isConsumed: boolean("is_consumed").notNull().default(false),
  data: jsonb("data").$type<InvitationToken>().notNull(),
});

// 8. Approval Records
export const approvalRecords = pgTable("approval_records", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull(),
  decidedAtUtc: text("decided_at_utc").notNull(),
  data: jsonb("data").$type<ApprovalRecord>().notNull(),
});

// 9. Check-in Audit Events
export const checkInAuditEvents = pgTable("check_in_audit_events", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull(),
  timestampUtc: text("timestamp_utc").notNull(),
  data: jsonb("data").$type<CheckInAuditEvent>().notNull(),
});

// 10. Door Tap Events
export const doorTapEvents = pgTable("door_tap_events", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull(),
  tappedAtUtc: text("tapped_at_utc").notNull(),
  data: jsonb("data").$type<DoorTapEvent>().notNull(),
});

// 11. Check-out Audit Events
export const checkOutAuditEvents = pgTable("check_out_audit_events", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull(),
  timestampUtc: text("timestamp_utc").notNull(),
  data: jsonb("data").$type<CheckOutAuditEvent>().notNull(),
});

// 12. Emergency Access Grants
export const emergencyAccessGrants = pgTable("emergency_access_grants", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").notNull(),
  createdAtUtc: text("created_at_utc").notNull(),
  data: jsonb("data").$type<EmergencyAccessGrant>().notNull(),
});

// 13. Host Arrival Notifications
export const hostArrivalNotifications = pgTable("host_arrival_notifications", {
  id: text("id").primaryKey(),
  hostId: text("host_id"),
  visitId: text("visit_id").notNull(),
  createdAtUtc: text("created_at_utc").notNull(),
  data: jsonb("data").$type<HostArrivalNotification>().notNull(),
});

/**
 * Generates idempotent DDL statements to initialize all VMS tables in PostgreSQL.
 */
export function getInitSchemaSql(): string {
  return `
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      site_name TEXT NOT NULL DEFAULT 'Gedung Utama',
      timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
      overstay_grace_minutes INTEGER NOT NULL DEFAULT 15,
      auto_check_in_early_buffer_minutes INTEGER NOT NULL DEFAULT 15,
      updated_at TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS facility_doors (
      door_index_code TEXT PRIMARY KEY,
      region_index_code TEXT,
      door_name TEXT NOT NULL,
      is_perimeter BOOLEAN NOT NULL DEFAULT FALSE,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS access_levels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS host_employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visitor_profiles (
      id TEXT PRIMARY KEY,
      certificate_no TEXT NOT NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      created_at_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitation_tokens (
      token TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approval_records (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      decided_at_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS check_in_audit_events (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      timestamp_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS door_tap_events (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      tapped_at_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS check_out_audit_events (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      timestamp_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_access_grants (
      id TEXT PRIMARY KEY,
      visit_id TEXT NOT NULL,
      created_at_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS host_arrival_notifications (
      id TEXT PRIMARY KEY,
      host_id TEXT,
      visit_id TEXT NOT NULL,
      created_at_utc TEXT NOT NULL,
      data JSONB NOT NULL
    );

    -- Single-site contract migration: backfill global site name and purge the
    -- deprecated Facility entity. All statements are idempotent so they are safe
    -- to run on both fresh and previously-initialized databases.
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS site_name TEXT NOT NULL DEFAULT 'Gedung Utama';
    ALTER TABLE visits DROP COLUMN IF EXISTS facility_id;
    ALTER TABLE access_levels DROP COLUMN IF EXISTS facility_id;
    ALTER TABLE facility_doors DROP COLUMN IF EXISTS facility_id;
    DROP TABLE IF EXISTS facilities;
  `;
}
