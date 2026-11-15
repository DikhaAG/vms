# 06: Group Registration Migration

**What to build:** Refactoring of the Group Registration page (`/vms/group-registration`) so that delegation headers, member table rows, photo attachments, and confirmed QR pass cards use `PageHeader`, `UiCard`, `UiButton`, and `UiBadge`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** ready-for-agent

- [ ] `src/app/vms/group-registration/page.tsx` updated to use `PageHeader`.
- [ ] Group details card and schedule inputs refactored with `UiCard`.
- [ ] Member entry grid and CSV bulk upload actions refactored with `UiButton` and Kinpaku input tokens.
- [ ] Confirmed group registration summary and individual QR pass credential cards refactored with `UiCard` and `UiBadge`.
- [ ] Legacy dark/light Tailwind utilities removed in favor of Kinpaku design tokens.
- [ ] `src/app/vms/group-registration/group-registration-client.test.tsx` passes with 100% success rate.

