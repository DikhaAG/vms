# 05: Pre-Registration & Self-Invite Form Migration

**What to build:** Refactoring of the Pre-Registration Form page (`/vms/pre-registration`) so that the 6 form sections, facility radio cards, webcam capture controls, invite link generator, and access level selections use `PageHeader`, `UiCard`, `UiButton`, and `UiBadge`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** resolved

- [x] `src/app/vms/pre-registration/page.tsx` updated to use `PageHeader`.
- [x] Section 1 (Facility selection & timezones) refactored with `UiCard` and standardized radio selection states.
- [x] Section 2 (Visitor identity data) refactored with uniform paper input styling and error states.
- [x] Section 3 (Biometric face photo upload & camera) refactored with `UiButton` controls and Kinpaku borders.
- [x] Section 4 (Schedule & purpose) and Section 5 (Internal host details) aligned with standard form typography and spacing.
- [x] Section 6 (Access level selection & tap quota modes) refactored with `UiCard` and tactile quota mode buttons.
- [x] Invitation link generation action and primary submission buttons converted to `UiButton`.
- [x] `src/app/vms/pre-registration/pre-registration-form.test.tsx` passes with 100% success rate.

## Answer

Migrated the Pre-Registration & Self-Invite form page (`/vms/pre-registration`) to use canonical UI primitives and the Kinpaku design system:

1. **Page Architecture (`src/app/vms/pre-registration/page.tsx`):**
   - Replaced legacy dual-class header with canonical `PageHeader` from `@/components/vms/ui` with `guidePageKey="preRegistration"`, badge "Kunjungan Individual", title, and subtitle.
2. **Form Sections & Primitives (`src/app/vms/pre-registration/pre-registration-form.tsx`):**
   - Form container standardized to `rounded-[var(--ks-radius-md)] border border-[var(--ks-rule-subtle)] bg-[var(--ks-paper-raised)]`.
   - **Section 1**: Facility selection radio cards refactored to `UiCard` with uniform radio card selection states (`border-[var(--ks-ink)] bg-[var(--ks-paper)] ring-1 ring-[var(--ks-ink)]`).
   - **Section 2**: Visitor identity inputs refactored with uniform paper input styling, focus rings, error labels, and returning visitor card with `UiButton` auto-fill action.
   - **Section 3**: Biometric face photo upload file trigger, camera capture toggle, and remove photo buttons converted to `UiButton`; face photo size indicator converted to `UiBadge`; webcam viewfinder and photo previews refactored with Kinpaku tokens.
   - **Sections 4 & 5**: Schedule, purpose, and host sponsorship inputs aligned with standard typography and spacing.
   - **Section 6**: Access level options and tap quota mode containers refactored with `UiCard`, `UiBadge` ("Keamanan Terpadu", "Standar"), and standardized form radio / checkbox elements.
   - **Footer Actions & Self-Invite Link**: Invite link generator action and primary submission buttons converted to `UiButton`; self-invite result card and final visit confirmation card migrated to `UiCard` with `UiBadge` status indicators.
3. **Verification:**
   - `pnpm test src/app/vms/pre-registration/pre-registration-form.test.tsx`: 2/2 tests passed (100%).
   - `pnpm typecheck`: Clean (0 errors).
   - `pnpm lint`: Clean (0 errors).

