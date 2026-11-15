# 03: Reception Desk Migration to Active-Monitoring Architecture

**What to build:** Refactoring of the Reception Desk page (`/vms/reception`) so that page layout, filter buttons, walk-in modal, webcam verification modal, and badge pass issuance modal use the unified reusable component suite and match the high-contrast architecture of `active-monitoring`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** claimed

- [ ] `src/app/vms/reception/page.tsx` updated to use `PageHeader`.
- [ ] Status filter buttons ("Semua", "Normal", "Overstay", "Kuota") updated to use `UiButton` or `UiKpiCard` with uniform Kinpaku active states and border radius.
- [ ] Walk-in registration modal refactored to use `UiModal`.
- [ ] Webcam photo capture modal refactored to use `UiModal` with standard buttons.
- [ ] Pass card and QR issuance modal refactored to use `UiModal`.
- [ ] Action buttons across reception tables and cards updated to standard `UiButton`.
- [ ] `src/app/vms/reception/reception-client.test.tsx` passes with 100% success rate.

