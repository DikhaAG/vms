# 05: Canonical Headless Data Table (`UiDataTable`) with Kinpaku Styling & nuqs URL State

**What to build:** Build a reusable canonical headless data table component (`UiDataTable` at `src/components/vms/ui/ui-data-table.tsx`) powered by `@tanstack/react-table`. Style it exclusively with Kinpaku tokens (`UiCard`, `UiBadge`, `UiButton`). Support column sorting, global text filtering, pagination controls, and empty state rendering with Indonesian dictionary strings. Integrate optional `nuqs` adapter hooks so search queries (`?q=...`), active page index, and sort directions synchronize to browser URL search parameters.

**Blocked by:** 01: Core DX Dependencies, Unified Client Providers, and Test Harness

**Status:** ready-for-agent

- [ ] Implement `UiDataTable` in `src/components/vms/ui/ui-data-table.tsx` with generic type `<TData, TValue>`.
- [ ] Provide column sorting with tactile header buttons and visual indicators (up/down chevrons).
- [ ] Provide pagination footer using `UiButton` and tabular page counters.
- [ ] Implement global search filter integration compatible with `UiFilterToolbar`.
- [ ] Provide optional `useTableUrlState` hook backed by `nuqs` for URL search params synchronization.
- [ ] Render empty state message localized via `idDict.statusBadges` / `idDict.layTerms`.
- [ ] Export `UiDataTable` from `src/components/vms/ui/index.ts`.
- [ ] Write comprehensive unit tests in `src/components/vms/ui/ui-data-table.test.tsx` testing sorting, filtering, pagination, and URL state sync.
- [ ] Verify that `pnpm check` passes with 0 warnings or errors.

