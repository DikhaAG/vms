# 01: Canonical Reusable UI Component Primitives

**What to build:** A foundational suite of reusable UI components (`UiButton`, `UiCard`, `UiCardHeader`, `UiCardContent`, `UiKpiCard`, `UiKpiGrid`, `UiFilterToolbar`, `UiBadge`, `UiModal`, `PageHeader`) implementing Kinpaku design tokens, uniform border radius, tactile micro-bevels, and accessible focus management, verified with comprehensive component unit tests.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `UiButton` component created supporting `primary`, `secondary`, `danger`, and `ghost` variants with uniform tactile bevels (`cap-lift`, `cap-press`), sizes (`sm`, `md`, `lg`), and standard `rounded-[var(--ks-radius-md)]`.
- [x] `UiCard`, `UiCardHeader`, and `UiCardContent` created providing uniform paper-raised background, subtle 1px rule border, and consistent internal padding.
- [x] `UiKpiCard` and `UiKpiGrid` created rendering eyebrow label, large font-mono tabular counter, description, LED glowing indicator, and optional interactive tab filter selection.
- [x] `UiFilterToolbar` created providing standard layout for search input, facility selector, and action buttons.
- [x] `UiBadge` created mapping status keys to localized labels and glowing LED dots based on the centralized Indonesian dictionary.
- [x] `UiModal` created wrapping accessible dialogs with focus trapping, backdrop blur, title bar, close trigger, content body, and action footer.
- [x] `PageHeader` created providing unified page titles, live status badge slot, subtitles, and guide modal triggers.
- [x] Unit tests for all components created and passing in Vitest.

## Answer

Implemented canonical reusable UI component suite and unit tests in commit `931082f` (merged into `feat/unified-ui-components-and-shell`):

- **Component Primitives (`src/components/vms/ui/`):**
  - `UiButton`: Supports `primary`, `secondary`, `danger`, and `ghost` variants with micro-bevel tactile interaction (`cap-lift`, `cap-press`), sizes (`sm`, `md`, `lg`), and standard token border radius.
  - `UiCard`, `UiCardHeader`, `UiCardContent`: Provides uniform paper-raised card styling with subtle borders and consistent padding.
  - `UiKpiCard` & `UiKpiGrid`: Standardized KPI metrics with eyebrow labels, tabular numbers, status LED indicators, and interactive tab filtering.
  - `UiFilterToolbar`: Standardized layout for search input, facility selector, and action buttons.
  - `UiBadge`: Maps status keys to localized Indonesian dictionary terms with glowing LED status dots.
  - `UiModal`: Accessible dialog modal featuring focus trapping, backdrop blur, title bar, close button, body, and action footer.
  - `PageHeader`: Standard header with title, subtitle, live status badge slot, and guide modal trigger.
  - `index.ts`: Centralized barrel export for all UI primitives.
- **Verification:**
  - `src/components/vms/ui/ui-components.test.tsx`: 23 passing component unit tests covering rendering, variants, interactions, and accessibility.
  - `pnpm test`, `pnpm typecheck`, and `pnpm lint` verified clean with 0 errors.

