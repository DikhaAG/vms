# 07: Access Levels Master Migration

**What to build:** Refactoring of the Access Levels Master page (`/vms/access-levels`) so that facility filters, HikCentral door synchronization triggers, access level card grids, and access level creation modals use `PageHeader`, `UiCard`, `UiButton`, `UiBadge`, and `UiModal`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** ready-for-agent

- [ ] `src/app/vms/access-levels/page.tsx` updated to use `PageHeader`.
- [ ] Facility filter dropdown and action buttons (Door Sync & Add Access Level) refactored with `UiButton` and `UiFilterToolbar`.
- [ ] Access level cards in grid refactored with `UiCard`, `UiBadge`, and tactile edit/delete triggers.
- [ ] Access level creation and modification modal (`AccessLevelFormModal`) refactored with `UiModal` and `useModalFocusTrap`.
- [ ] Door selection pill items and time schedule labels aligned with Kinpaku tokens.
- [ ] `src/app/vms/access-levels/access-levels-client.test.tsx` passes with 100% success rate.

