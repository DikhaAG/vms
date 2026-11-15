# 07: Active Monitoring Migration to `UiDataTable` & TanStack Query Polling

**What to build:** Refactor the Active Monitoring operator dashboard (`src/app/vms/active-monitoring/active-monitoring-client.tsx`) to utilize `UiDataTable` for active visits and door event streams. Replace manual interval timers and raw `fetch` calls with `@tanstack/react-query` background polling and query caching, ensuring real-time hardware status synchronization and reactive updates during emergency access overrides.

**Blocked by:** 01: Core DX Dependencies, Unified Client Providers, and Test Harness, 05: Canonical Headless Data Table (`UiDataTable`) with Kinpaku Styling & nuqs URL State

**Status:** ready-for-human

- [x] Migrate active visit list and event stream in `active-monitoring-client.tsx` to `UiDataTable`.
- [x] Implement `@tanstack/react-query` `useQuery` hooks with automated background polling (e.g. 5-second interval) for live door status and active occupancy counts.
- [x] Connect emergency access overrides and checkout actions to TanStack Query mutation hooks with automatic cache invalidation.
- [x] Retain all KPI cards, emergency modal workflows, and focus-trapped dialogs without UI regressions.
- [x] Update `active-monitoring-client.test.tsx` using `renderWithVmsProviders` to verify polling and table rendering.
- [x] Verify that `pnpm check` passes with zero errors.

## Comments

### Implementation Summary
- Extracted table column definitions to `src/app/vms/active-monitoring/columns.tsx` using `createColumnHelper`.
- Replaced manual card grid with canonical `UiDataTable` supporting search, pagination, and sorting synchronized with `nuqs` URL parameters.
- Replaced imperative fetch loops with `@tanstack/react-query` `useQuery` hooks with 5-second background polling for active visits (`["active-visits", facilityId]`) and hardware doors (`["doors", facilityId]`).
- Migrated normal checkout, forced checkout, and emergency access revocation to TanStack Query `useMutation` hooks with automated query cache invalidation and Sonner toast notifications.
- Integrated `UiKpiGrid` and `UiKpiCard` primitives with tactile counters and LED indicators.
- Verified test suite: 86 test files, 770 tests passing with 100% success rate; ESLint and TypeScript checks pass with zero errors.
