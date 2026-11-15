# 07: Active Monitoring Migration to `UiDataTable` & TanStack Query Polling

**What to build:** Refactor the Active Monitoring operator dashboard (`src/app/vms/active-monitoring/active-monitoring-client.tsx`) to utilize `UiDataTable` for active visits and door event streams. Replace manual interval timers and raw `fetch` calls with `@tanstack/react-query` background polling and query caching, ensuring real-time hardware status synchronization and reactive updates during emergency access overrides.

**Blocked by:** 01: Core DX Dependencies, Unified Client Providers, and Test Harness, 05: Canonical Headless Data Table (`UiDataTable`) with Kinpaku Styling & nuqs URL State

**Status:** ready-for-agent

- [ ] Migrate active visit list and event stream in `active-monitoring-client.tsx` to `UiDataTable`.
- [ ] Implement `@tanstack/react-query` `useQuery` hooks with automated background polling (e.g. 5-second interval) for live door status and active occupancy counts.
- [ ] Connect emergency access overrides and checkout actions to TanStack Query mutation hooks with automatic cache invalidation.
- [ ] Retain all KPI cards, emergency modal workflows, and focus-trapped dialogs without UI regressions.
- [ ] Update `active-monitoring-client.test.tsx` using `renderWithVmsProviders` to verify polling and table rendering.
- [ ] Verify that `pnpm check` passes with zero errors.

