# 08: Contract Phase — Purge Facility Entity, Clean Schema & Full System Verification

**What to build:** Complete the contract phase of the single-site lean architecture refactor. Drop the deprecated `facilities` database table, remove unused `facility_id` columns from PostgreSQL schema and Drizzle definitions, remove deprecated `/api/vms/facilities` routes and legacy tRPC procedures, eliminate leftover facility selector logic from UI components, update the domain glossary and Indonesian translations, and execute full end-to-end regression verification across all test suites.

**Blocked by:** 02: HikCentral Native Door Synchronization & Zero-Default Seed, 03: Flat Access Levels & Door Permission Assignment, 05: Reception Desk & Walk-In Intake, 06: Active Monitoring, System-Wide Overstay & Touchless Auto Check-In, 07: Unified Approvals Queue & Group Registration

**Status:** resolved

- [x] PostgreSQL Drizzle schema drops the `facilities` table and drops `facility_id` columns from `visits`, `doors`, and `access_levels`.
- [x] Deprecated facility API routes (`src/app/api/vms/facilities/`) and tRPC `facilities` router are removed.
- [x] Legacy `facilityId` parameters and facility selector logic are completely eliminated from `UiFilterToolbar` and UI components.
- [x] Terminology and translations in `GLOSSARY.md` and `src/lib/vms/i18n/id.ts` reflect single-site architecture and global settings.
- [x] Full regression test suite (`pnpm test`, `pnpm typecheck`, `pnpm lint`) passes with 100% green integrity across all unit, integration, and E2E suites.

## Comments

- Resolved on `feat/single-site-lean-architecture`. Init SQL drops `facilities` and the `facility_id` columns on `visits`, `access_levels`, and `facility_doors` with idempotent DDL. The `src/app/api/vms/facilities/` routes are deleted. HEAD had no tRPC `facilities` router, so nothing was removed there. `UiFilterToolbar` and `UiDataTable` rename `facilitySlot` to `filterSlot`. Door contracts, both repositories, the HikCentral door adapter, and `POST /api/vms/sync/doors` drop `facilityId`; legacy payloads still parse because Zod strips the key.
- Closes the items deferred from ticket 06: `ActiveVisitSummary.facility` is now `site` (from `siteFromSettings()` in `src/lib/vms/site-contract.ts`), and `evaluateOverstayStatus` names its parameter `settings`. The public invite metadata also moves from `facility` to `site` and drops the unfilled `address` and the fake `id`. The unused tRPC `facilityTimezone` context option is removed.
- Verification: `pnpm lint`, `pnpm typecheck`, and `pnpm test` (91 files, 831 tests) pass.
- Follow-up, not in this ticket's acceptance boxes: rename the physical `facility_doors` table, the `FacilityDoor` type, the `scheduledStartTimeFacility` / `scheduledEndTimeFacility` Visit fields, and the `formatInFacilityTimezone` / `formatFacilityIso` helpers. The data migration for `facility_doors` and the Visit JSONB fields needs its own ticket. Code review also noted that `VmsLayout` awaits `getSettings()` with no fallback, so a database outage takes down the shell.
