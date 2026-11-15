# 06: Visitors Directory Migration to `UiDataTable`

**What to build:** Refactor the Visitors Directory view (`src/app/vms/visitors/visitors-client.tsx`) from hand-rolled `<table>` and manual pagination state to the canonical `UiDataTable` component. Leverage TanStack Table column definitions for visitor names, company, host employee, access badge, and status, and enable URL search parameter synchronization via `nuqs` so that filter queries can be bookmarked and shared.

**Blocked by:** 05: Canonical Headless Data Table (`UiDataTable`) with Kinpaku Styling & nuqs URL State

**Status:** ready-for-human

- [x] Define TanStack Table column definitions for visitor records using `createColumnHelper<Visitor>()`.
- [x] Replace bespoke table markup, pagination controls, and filter state in `visitors-client.tsx` with `UiDataTable`.
- [x] Enable `nuqs` search params sync for search query (`?q=...`) and page index (`?page=...`).
- [x] Retain all modal flows (visitor details, badge inspection, access history) without functional regressions.
- [x] Update `src/app/vms/visitors/visitors-client.test.tsx` to verify table interactions with `UiDataTable`.
- [x] Verify that `pnpm check` passes with 100% test success rate.

