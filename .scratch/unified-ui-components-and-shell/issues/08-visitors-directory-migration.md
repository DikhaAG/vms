# 08: Visitors Directory & PDP Archive Migration

**What to build:** Refactoring of the Visitors Directory page (`/vms/visitors`) so that metric KPI counters, search and PDP compliance filters, visitor table rows, and soft-delete confirmation dialogs use `PageHeader`, `UiKpiGrid`, `UiKpiCard`, `UiFilterToolbar`, `UiCard`, `UiButton`, `UiBadge`, and `UiModal`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** resolved

- [x] `src/app/vms/visitors/page.tsx` updated to use `PageHeader`.
- [x] Metric summary cards (Total Basis Data, Profil Aktif, Arsip PDP) refactored with `UiKpiGrid` and `UiKpiCard`.
- [x] Search input and PDP archive toggle checkbox refactored with `UiFilterToolbar`.
- [x] Visitors profiles table refactored with `UiCard`, Kinpaku table borders, and tactile `UiButton` actions.
- [x] Soft-delete confirmation modal refactored with `UiModal` and `useModalFocusTrap`.
- [x] All dual-class dark/light classes replaced with Kinpaku tokens.
- [x] `src/app/vms/visitors/visitors-client.test.tsx` passes with 100% success rate.

## Answer

Migrated `/vms/visitors` to use canonical UI component suite (`PageHeader`, `UiKpiGrid`, `UiKpiCard`, `UiFilterToolbar`, `UiCard`, `UiBadge`, `UiButton`, `UiModal`), eliminating legacy dual-class Tailwind styles and ensuring accessible dialog handling via `useModalFocusTrap`. Verified with 100% Vitest pass rate and clean typecheck/lint.


