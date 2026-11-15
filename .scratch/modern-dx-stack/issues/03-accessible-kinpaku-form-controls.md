# 03: Accessible Kinpaku Form Component Suite

**What to build:** Build a canonical suite of accessible form field controls in `src/components/vms/ui/` (`UiFormField`, `UiTextInput`, `UiSelect`, `UiTextarea`) styled with Kinpaku design tokens. The components must automatically wire label associations (`htmlFor`), accessible descriptions, helper text, and Zod/RHF validation error messages (`aria-invalid`, `aria-describedby`) without manual `useId` boilerplate, adhering to strict `jsx-a11y/label-has-associated-control` standards.

**Blocked by:** 01: Core DX Dependencies, Unified Client Providers, and Test Harness, 02: Isomorphic Zod Contracts with Backward-Compatible Validation Wrappers

**Status:** ready-for-agent

- [ ] Create `UiFormField` wrapper component managing `<label>`, optional badge, helper description, and accessible error message slots with automatic ID generation.
- [ ] Create `UiTextInput` styled with Kinpaku border rules, tactile focus states, disabled styles, and invalid state indicators.
- [ ] Create `UiSelect` styled with Kinpaku tokens, matching chevron indicator, and error states.
- [ ] Create `UiTextarea` with multi-line layout and matching tactile focus styling.
- [ ] Export new form components from `src/components/vms/ui/index.ts`.
- [ ] Write comprehensive unit tests in `src/components/vms/ui/ui-form.test.tsx` verifying label association, focus handling, and accessible error message rendering.
- [ ] Verify that `pnpm check` passes with zero lint or type errors.

