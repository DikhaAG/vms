# 04: Pre-Registration Vertical Slice (RHF + Zod + Sonner Pilot)

**What to build:** Refactor the 1,568-line monolithic `PreRegistrationForm` component (`src/app/vms/pre-registration/pre-registration-form.tsx`) using React Hook Form, Zod schema resolver (`@hookform/resolvers/zod`), canonical Kinpaku form field primitives (`UiFormField`, `UiTextInput`, `UiSelect`), and Sonner toast notifications. Integrate webcam photo capture and tap quota selections via RHF `<Controller />`, eliminating manual `useState` overhead while retaining 100% of existing features (multi-facility support, access level selection, live face normalization, submission feedback).

**Blocked by:** 02: Isomorphic Zod Contracts with Backward-Compatible Validation Wrappers, 03: Accessible Kinpaku Form Component Suite

**Status:** ready-for-human

- [x] Connect `PreRegistrationForm` to React Hook Form with `zodResolver(preRegistrationInputSchema)`.
- [x] Replace hand-rolled input fields with canonical `UiFormField`, `UiTextInput`, and `UiSelect` components.
- [x] Connect webcam photo capture (`processBrowserImageFile`) and tap quota radio cards via RHF `<Controller />`.
- [x] Replace inline status banners and alerts with Sonner toasts (`toast.success`, `toast.error`) pulling localized Indonesian strings from `idDict`.
- [x] Drastically reduce file length and cyclomatic complexity of `pre-registration-form.tsx`.
- [x] Update and expand `pre-registration-form.test.tsx` using `renderWithVmsProviders`, asserting user interactions, validation feedback, and successful submission.
- [x] Verify that `pnpm check` passes with 100% test success rate.

