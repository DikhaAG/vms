# 04: Approvals Queue Migration to Active-Monitoring Architecture

**What to build:** Refactoring of the Approvals Queue page (`/vms/approvals`) to eliminate legacy Tailwind classes (`bg-white`, `border-neutral-200`, `bg-neutral-900`) and adopt `PageHeader`, `UiFilterToolbar`, `UiCard`, `UiBadge`, `UiButton`, and `UiModal`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** resolved

- [x] `src/app/vms/approvals/page.tsx` updated to use `PageHeader`.
- [x] Facility and approver persona controls refactored to use `UiFilterToolbar`.
- [x] Normal and escalated queue tabs refactored with uniform typography and badge counters.
- [x] Approval visit cards and escalation items refactored with `UiCard`, `UiBadge`, and tactile `UiButton` actions (Setujui, Tolak, Eskalasi).
- [x] Rejection modal refactored to use `UiModal`.
- [x] All dual-class dark/light legacy styles removed in favor of Kinpaku design tokens.
- [x] `src/app/vms/approvals/approvals-client.test.tsx` passes with 100% success rate.

## Answer

Migrated the Approvals Queue page (`/vms/approvals`) to the Active-Monitoring canonical component architecture:

- **Page Header (`src/app/vms/approvals/page.tsx`):**
  - Replaced manual flex header with canonical `PageHeader` from `@/components/vms/ui` with `pageKey="approvals"` and `badge="Otorisasi Akses"`.
  - Automatically renders localized title, subtitle, and accessible `PageGuideModal`.
- **Filtering Toolbar (`src/app/vms/approvals/approvals-client.tsx`):**
  - Refactored facility selector and approver persona controls into `UiFilterToolbar`.
  - Styled dropdowns using Kinpaku tokens (`bg-[var(--ks-paper)]`, `border-[var(--ks-rule-subtle)]`, `focus:border-[var(--ks-kinpaku)]`).
  - Active queue counts rendered in `actionsSlot`.
- **Queue Tabs (`approvals-client.tsx`):**
  - Refactored "Menunggu Persetujuan Normal" and "Eskalasi Daftar Pantauan" tabs with uniform typography, high-contrast active states, and Kinpaku counter badges.
- **Approval Cards (`VisitCard` in `approvals-client.tsx`):**
  - Refactored approval visit cards into `UiCard` containers with tactile micro-bevels.
  - Replaced legacy color badges with `UiBadge` (amber glow for pending, vermilion glow for watch-list escalations).
  - Adopted tactile `UiButton` for "Setujui Kunjungan" and "Tolak Kunjungan" actions.
- **Rejection Modal (`approvals-client.tsx`):**
  - Replaced ad-hoc modal dialog with canonical `UiModal`, complete with focus trapping, backdrop blur, Escape key handling, and standardized `UiButton` footer controls.
- **Verification:**
  - `src/app/vms/approvals/approvals-client.test.tsx`: 100% pass rate (2/2 tests).
  - `src/test/e2e-ui-indonesian-shell.test.tsx`: 100% pass rate (23/23 tests).
  - `src/components/vms/ui/ui-components.test.tsx`: 100% pass rate (23/23 tests).
  - `pnpm typecheck` and `pnpm lint` passed with 0 errors.
