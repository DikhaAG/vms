# Status: ready-for-agent

# Spec: Single-Site Lean Architecture and Native HikCentral Alignment

## Problem Statement

The Visitor Management System currently forces an artificial `Facility` entity and mandatory `facilityId` scoping across every Visit, Access Level, Door, and UI screen. This was originally introduced for multi-facility SaaS scaling and multi-timezone offsets, but it causes significant problems:

1. **Architectural Mismatch with HikCentral**: HikCentral OpenAPI V3.1.1 does not have a "Facility" entity. Its physical devices, access points, and controllers are modeled flatly or grouped by regions (`regionIndexCode`). Forcing `facilityId` creates a synthetic impedance mismatch against HikCentral gateway synchronization.
2. **Redundant Operational Friction**: The deployment does not require multi-branch enterprise support. Operators and Receptionists must needlessly select or filter by "Gedung/Fasilitas" on every single operational view (Reception, Active Monitoring, Pre-Registration, Access Levels).
3. **Fragmented Business Rules**: Operating rules like overstay grace periods (`overstayGraceMinutes`) and touchless auto check-in early arrival buffers (`autoCheckInEarlyBufferMinutes`) are split per facility, rather than being managed as coherent, unified system-wide policies.
4. **Unwanted Hardcoded Default Doors**: Initial hardcoded doors from hypothetical Jakarta, Bali, and Jayapura sites clutter the database on fresh installs instead of allowing clean first-time setup or direct synchronization from live HikCentral hardware.

## Solution

Refactor the system into a **Single-Site Lean Architecture** that natively mirrors HikCentral resource topology:

1. **Eliminate the `Facility` Entity**: Remove the `facilities` database table and strip `facilityId` from all data models (`visits`, `doors`, `access_levels`), Zod schemas, API contracts, and repository methods.
2. **Unified Global Configuration (`system_settings`)**: Introduce a singleton database table and repository methods for global operational settings:
   - `timezone`: Canonical IANA timezone (default: `Asia/Jakarta`).
   - `overstayGraceMinutes`: System-wide grace duration before an uncleared visit triggers an `OVERSTAY` status (default: 15 minutes).
   - `autoCheckInEarlyBufferMinutes`: Allowed early arrival buffer for perimeter door fast-track auto check-in (default: 15 minutes).
3. **Flat Door & Access Level Hierarchy with Native Regions**:
   - Model doors flatly as `Door` (migrating from `FacilityDoor` / `facility_doors`).
   - Maintain an optional `regionIndexCode` string aligning directly with HikCentral logical resource regions.
   - Start with zero hardcoded default doors (`DEFAULT_DOORS = []`), enabling operators to register doors manually or synchronize them live via `POST /api/vms/sync/doors`.
4. **Streamlined UI & Global Alignment**:
   - Remove facility selector dropdowns from `UiFilterToolbar` across Reception, Active Monitoring, Approvals, Pre-Registration, and Access Levels.
   - Replace `/api/vms/facilities` routes with a dedicated `/api/vms/settings` endpoint and tRPC `settings` router.
   - Format ISO 8601 timestamps sent to HikCentral using the global system timezone.

---

## User Stories

1. As an Administrator, I want the system to manage physical access points in a flat structure without mandatory facility groupings, so that the door list mirrors our actual HikCentral controller topology.
2. As an Administrator, I want global operational settings (System Timezone, Overstay Grace Period, Fast-Track Early Buffer) stored in a single configuration record, so that I can update operational thresholds in one place without code redeployment.
3. As an Administrator, I want a fresh system installation to start with an empty door list, so that our team can either define doors cleanly or synchronize them directly from HikCentral without deleting fixture data.
4. As an Administrator, I want to synchronize doors from HikCentral with their native `regionIndexCode`, so that doors reflect physical regions established in HikCentral without custom facility mappings.
5. As an Administrator, I want to view and edit system-wide settings through a dedicated `/api/vms/settings` API and tRPC router, so that front-end administration interfaces can configure system behavior cleanly.
6. As a Receptionist, I want to open the reception check-in dashboard without having to choose a facility filter, so that I can immediately search, verify, and process arriving visitors.
7. As a Receptionist, I want to register a walk-in visitor without selecting a facility, so that walk-in intake is faster and less prone to user error.
8. As a Receptionist, I want all active visits displayed on a unified desk monitor without facility filtering, so that I have complete situational awareness of everyone currently in the building.
9. As an Operator monitoring active visitors, I want to view all currently checked-in visitors and perimeter alerts on a single screen without toggling facility dropdowns, so that security oversight is frictionless.
10. As an Operator granting temporary emergency door access, I want to pick doors from a single authoritative building door checklist, so that emergency permissions can be assigned immediately during an incident.
11. As an Operator, I want overstay warnings to trigger according to a single system-wide overstay grace period, so that security enforcement is consistent for all visits.
12. As a Host employee, I want to schedule a pre-registered visit without picking a facility from a dropdown, so that appointment creation requires fewer steps.
13. As a Host employee, I want the visitor's appointment credentials pushed to HikCentral with the correct local timezone offset automatically, so that the visitor's QR code or face scan unlocks turnstiles at the scheduled hour.
14. As an Approver, I want to review pending visit requests in a single unified approval queue without filtering by facility, so that I can approve or reject visits without missing requests.
15. As a Visitor arriving for a scheduled visit, I want my first scan at any perimeter turnstile to trigger Fast-Track Auto Check-In within the global early buffer window, so that I can enter seamlessly without queuing at the front desk.
16. As a Visitor, I want my visit record to track door taps and last seen doors accurately, so that building security knows my location in case of an emergency evacuation.
17. As an Operator performing forced check-out, I want to terminate a visit and deauthorize access credentials across all building terminals instantly, so that security integrity is maintained when a visitor leaves without scanning out.
18. As a Developer, I want database tables (`visits`, `doors`, `access_levels`) to omit `facility_id`, so that SQL queries, Drizzle schemas, and joins are simpler and faster.
19. As a Developer, I want Zod validation contracts to enforce required fields without optional or legacy facility parameters, so that API request payloads remain clean and strict.
20. As a Developer, I want tests to assert behavior against the unified single-site repository without mocking multiple facility fixtures, so that test suites run faster and are easier to maintain.

---

## Implementation Decisions

### 1. Database Schema & Persistence (PostgreSQL + Drizzle ORM)
- **Drop Table `facilities`**: Remove the `facilities` table entirely.
- **New Table `system_settings`**:
  ```ts
  export const systemSettings = pgTable("system_settings", {
    id: text("id").primaryKey(), // constant singleton "default"
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    overstayGraceMinutes: integer("overstay_grace_minutes").notNull().default(15),
    autoCheckInEarlyBufferMinutes: integer("auto_check_in_early_buffer_minutes").notNull().default(15),
    updatedAt: text("updated_at").notNull(),
    data: jsonb("data").$type<SystemSettings>().notNull(),
  });
  ```
- **Refactor Table `facility_doors` to `doors`**:
  - Remove `facility_id` column.
  - Rename table to `doors` (or aliased table).
  - Include optional `regionIndexCode` column for native HikCentral region mapping.
- **Refactor Table `access_levels`**:
  - Remove `facility_id` column.
- **Refactor Table `visits`**:
  - Remove `facility_id` column.
  - Remove `scheduledStartTimeFacility` and `scheduledEndTimeFacility` in favor of ISO 8601 UTC strings alongside local wall-clock representation computed via `systemSettings.timezone`.

### 2. Repository Interface (`IVmsRepository`)
- **Remove Facility Operations**:
  - Delete `getFacility`, `listFacilities`, `saveFacility`, `updateFacility`.
- **Add Settings Operations**:
  - `getSettings(): Promise<SystemSettings>`
  - `updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings>`
- **Flatten Operational Signatures**:
  - `listVisits(filter?: ListVisitsFilter)`: `ListVisitsFilter` retains only `status`.
  - `searchVisits(query: string, status?: VisitStatus | VisitStatus[])`: drop `facilityId`.
  - `getVisitsByStatus(statuses: VisitStatus | VisitStatus[])`: drop `facilityId`.
  - `listAccessLevels()`: drop `facilityId`.
  - `listActiveVisits()`: drop `facilityId`.
  - `listDoors()`: drop `facilityId`.
  - `getDoorByName(doorName: string)`: drop `facilityId`.
  - `findDoor(codeOrName: string)`: drop `facilityId`.
- **Rename Data Types**:
  - `FacilityDoor` renamed to `Door` (exporting `type FacilityDoor = Door` temporarily for non-breaking transitions).
- **Default Seed Data**:
  - `DEFAULT_DOORS = []` (empty array).
  - `DEFAULT_ACCESS_LEVELS = []` (empty array, populated by admin after doors exist).
  - `DEFAULT_SYSTEM_SETTINGS: SystemSettings = { timezone: "Asia/Jakarta", overstayGraceMinutes: 15, autoCheckInEarlyBufferMinutes: 15 }`.

### 3. HikCentral Integration & Timezone Handling
- When creating visitor appointments via `POST /artemis/api/visitor/v2/appointment`, convert visit UTC timestamps to formatted ISO 8601 strings with local offset (e.g. `2026-11-15T09:00:00+07:00`) using `systemSettings.timezone` (with fallback to `process.env.APP_TIMEZONE || "Asia/Jakarta"`).
- In `syncHikCentralDoors`:
  - Fetch doors via `POST /artemis/api/resource/v1/acsDoor/acsDoorList`.
  - Map each door directly into `Door` without assigning a synthetic `facilityId`.
  - Preserve `regionIndexCode` received from HikCentral.

### 4. API Routes & tRPC Router
- **Delete Routes**:
  - `src/app/api/vms/facilities/route.ts`
  - `src/app/api/vms/facilities/[id]/route.ts`
- **Add Route**:
  - `src/app/api/vms/settings/route.ts`: handles `GET` and `PUT` for `SystemSettings`.
- **Update Existing Routes**:
  - Remove `facilityId` query parameters and payload validations across:
    - `/api/vms/pre-registration`
    - `/api/vms/check-in/walk-in`
    - `/api/vms/check-in/search`
    - `/api/vms/active-visits`
    - `/api/vms/access-levels`
    - `/api/vms/doors`
- **Update tRPC Routers**:
  - Replace `facilities` router with `settings` router (`getSettings`, `updateSettings`).
  - Strip `facilityId` inputs from `visits` and `accessLevels` routers.

### 5. UI Components & Shell Refactoring
- **`UiFilterToolbar`**:
  - Remove facility select dropdown and facility change event handlers.
  - Simplify toolbar to search input, status filter pills, and action slots.
- **Screen Updates**:
  - `/vms/reception`: Remove facility switcher; search visits across the entire site.
  - `/vms/active-monitoring`: Remove facility switcher; monitor all active on-site visits and perimeter doors.
  - `/vms/approvals`: Remove facility switcher; display all visits awaiting approval.
  - `/vms/pre-registration`: Remove facility selection field from appointment form.
  - `/vms/access-levels`: Remove facility selector; display and manage building access levels flatly.
- **Localization & Glossary**:
  - Update `GLOSSARY.md` and `src/lib/vms/i18n/id.ts` replacing `Facility` with `System Settings`.

---

## Testing Decisions

### Seams to Test
- **Primary Seam: API / tRPC Integration Layer**: Test complete business flows (pre-registration -> approval -> check-in -> door tap -> check-out -> settings update) by issuing requests to the API and tRPC routers, verifying that operations succeed without any `facilityId`.
- **Secondary Seam: Repository Contract Layer (`IVmsRepository`)**: Verify that `InMemoryVmsRepository` and `PostgresVmsRepository` adhere strictly to the simplified contract (handling visits, doors, and settings with empty defaults and global policies).

### Good Test Principles
- Test external behavior and business outcomes (e.g. a visit triggers `OVERSTAY` after `scheduledEndTimeUtc + overstayGraceMinutes`), not internal state or schema column details.
- Validate that door synchronization from HikCentral populates the empty door repository directly.
- Ensure time-window validations format valid HikCentral ISO 8601 offset strings based on global timezone settings.

### Prior Art
- `src/server/trpc/routers.test.ts`: Existing tRPC integration tests verifying procedures end-to-end.
- `src/lib/vms/repository.test.ts`: Existing test harness for repository operations.
- `src/test/e2e-access-enhancements.test.ts`: Workflow tests for check-in and door tap cycles.

---

## Out of Scope

- Multi-tenant data isolation or multi-tenant database partitioning.
- Multi-server HikCentral gateway failover (system operates against a single configured HikCentral Artemis host).
- Floorplan graphic mapping or 3D CAD viewer for doors.

---

## Further Notes

- Governed by [ADR 0010](file:///Users/a69/Desktop/DESKTOP/TAM/vms/docs/adr/0010-single-site-lean-architecture-and-native-hikcentral-alignment.md), which officially supercedes [ADR 0002](file:///Users/a69/Desktop/DESKTOP/TAM/vms/docs/adr/0002-facility-timezone-and-utc-storage.md) and [ADR 0003](file:///Users/a69/Desktop/DESKTOP/TAM/vms/docs/adr/0003-multi-facility-saas-architecture.md).
- Status set to `ready-for-agent` as all architectural decisions and design tree branches have been resolved.
