# 01: Canonical Reusable UI Component Primitives

**What to build:** A foundational suite of reusable UI components (`UiButton`, `UiCard`, `UiCardHeader`, `UiCardContent`, `UiKpiCard`, `UiKpiGrid`, `UiFilterToolbar`, `UiBadge`, `UiModal`, `PageHeader`) implementing Kinpaku design tokens, uniform border radius, tactile micro-bevels, and accessible focus management, verified with comprehensive component unit tests.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `UiButton` component created supporting `primary`, `secondary`, `danger`, and `ghost` variants with uniform tactile bevels (`cap-lift`, `cap-press`), sizes (`sm`, `md`, `lg`), and standard `rounded-[var(--ks-radius-md)]`.
- [ ] `UiCard`, `UiCardHeader`, and `UiCardContent` created providing uniform paper-raised background, subtle 1px rule border, and consistent internal padding.
- [ ] `UiKpiCard` and `UiKpiGrid` created rendering eyebrow label, large font-mono tabular counter, description, LED glowing indicator, and optional interactive tab filter selection.
- [ ] `UiFilterToolbar` created providing standard layout for search input, facility selector, and action buttons.
- [ ] `UiBadge` created mapping status keys to localized labels and glowing LED dots based on the centralized Indonesian dictionary.
- [ ] `UiModal` created wrapping accessible dialogs with focus trapping, backdrop blur, title bar, close trigger, content body, and action footer.
- [ ] `PageHeader` created providing unified page titles, live status badge slot, subtitles, and guide modal triggers.
- [ ] Unit tests for all components created and passing in Vitest.

