# 08: Visitors Directory & PDP Archive Migration

**What to build:** Refactoring of the Visitors Directory page (`/vms/visitors`) so that metric KPI counters, search and PDP compliance filters, visitor table rows, and soft-delete confirmation dialogs use `PageHeader`, `UiKpiGrid`, `UiKpiCard`, `UiFilterToolbar`, `UiCard`, `UiButton`, `UiBadge`, and `UiModal`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** ready-for-agent

- [ ] `src/app/vms/visitors/page.tsx` updated to use `PageHeader`.
- [ ] Metric summary cards (Total Basis Data, Profil Aktif, Arsip PDP) refactored with `UiKpiGrid` and `UiKpiCard`.
- [ ] Search input and PDP archive toggle checkbox refactored with `UiFilterToolbar`.
- [ ] Visitors profiles table refactored with `UiCard`, Kinpaku table borders, and tactile `UiButton` actions.
- [ ] Soft-delete confirmation modal refactored with `UiModal` and `useModalFocusTrap`.
- [ ] All dual-class dark/light classes replaced with Kinpaku tokens.
- [ ] `src/app/vms/visitors/visitors-client.test.tsx` passes with 100% success rate.

