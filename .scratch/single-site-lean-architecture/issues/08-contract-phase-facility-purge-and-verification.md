# 08: Contract Phase — Purge Facility Entity, Clean Schema & Full System Verification

**What to build:** Complete the contract phase of the single-site lean architecture refactor. Drop the deprecated `facilities` database table, remove unused `facility_id` columns from PostgreSQL schema and Drizzle definitions, remove deprecated `/api/vms/facilities` routes and legacy tRPC procedures, eliminate leftover facility selector logic from UI components, update the domain glossary and Indonesian translations, and execute full end-to-end regression verification across all test suites.

**Blocked by:** 02: HikCentral Native Door Synchronization & Zero-Default Seed, 03: Flat Access Levels & Door Permission Assignment, 05: Reception Desk & Walk-In Intake, 06: Active Monitoring, System-Wide Overstay & Touchless Auto Check-In, 07: Unified Approvals Queue & Group Registration

**Status:** ready-for-agent

- [ ] PostgreSQL Drizzle schema drops the `facilities` table and drops `facility_id` columns from `visits`, `doors`, and `access_levels`.
- [ ] Deprecated facility API routes (`src/app/api/vms/facilities/`) and tRPC `facilities` router are removed.
- [ ] Legacy `facilityId` parameters and facility selector logic are completely eliminated from `UiFilterToolbar` and UI components.
- [ ] Terminology and translations in `GLOSSARY.md` and `src/lib/vms/i18n/id.ts` reflect single-site architecture and global settings.
- [ ] Full regression test suite (`pnpm test`, `pnpm typecheck`, `pnpm lint`) passes with 100% green integrity across all unit, integration, and E2E suites.
