# 05: E2E UI Verification, Accessibility & Impeccable Visual Audit

**What to build:** Create end-to-end integration and accessibility test coverage verifying complete user journeys across all localized pages: desktop sidebar navigation, responsive mobile drawer toggle, modal focus trapping (Escape and Tab keys), page guide modal opening on every route, zero remaining raw English technical strings on user-facing paths, full regression pass (`pnpm check`), and clean Turbopack production compilation (`pnpm build`).

**Blocked by:** 03: Core Operations Localization & Page Guides, 04: Invitation, Security & Public Self-Registration Localization

**Status:** completed

- [x] End-to-end test suite (`src/test/e2e-ui-indonesian-shell.test.tsx`) verifies full user journey:
  - Navigating through all sidebar links and verifying correct active route styling.
  - Toggling mobile hamburger drawer on viewport < 1024px and clicking navigation links.
  - Opening and dismissing `PageGuideModal` across each operational page.
  - Submitting self-registration on `/invite/[token]` with localized success state.
- [x] Accessibility audit:
  - All interactive elements have descriptive Indonesian `aria-label`s or associated labels (`htmlFor`).
  - Modal dialogs trap focus and close on Escape key or backdrop click.
  - Status chips meet WCAG AA contrast standards.
- [x] Confirms full regression suite passes cleanly (`pnpm check` exits 0 with 100% tests passing).
- [x] Next.js 16 production build compiles with Turbopack (`pnpm build`) without errors or bundle warnings.

