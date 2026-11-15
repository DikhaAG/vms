# 05: Pre-Registration & Self-Invite Form Migration

**What to build:** Refactoring of the Pre-Registration Form page (`/vms/pre-registration`) so that the 6 form sections, facility radio cards, webcam capture controls, invite link generator, and access level selections use `PageHeader`, `UiCard`, `UiButton`, and `UiBadge`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** claimed

- [ ] `src/app/vms/pre-registration/page.tsx` updated to use `PageHeader`.
- [ ] Section 1 (Facility selection & timezones) refactored with `UiCard` and standardized radio selection states.
- [ ] Section 2 (Visitor identity data) refactored with uniform paper input styling and error states.
- [ ] Section 3 (Biometric face photo upload & camera) refactored with `UiButton` controls and Kinpaku borders.
- [ ] Section 4 (Schedule & purpose) and Section 5 (Internal host details) aligned with standard form typography and spacing.
- [ ] Section 6 (Access level selection & tap quota modes) refactored with `UiCard` and tactile quota mode buttons.
- [ ] Invitation link generation action and primary submission buttons converted to `UiButton`.
- [ ] `src/app/vms/pre-registration/pre-registration-form.test.tsx` passes with 100% success rate.

