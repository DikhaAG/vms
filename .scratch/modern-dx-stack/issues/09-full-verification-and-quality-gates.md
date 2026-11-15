# 09: End-to-End System Verification, A11y Audit, and Quality Gate Sign-Off

**What to build:** Perform complete end-to-end regression testing, accessibility audits, and quality gate verification across the entire modern DX stack. Ensure all updated routes (`/vms/pre-registration`, `/vms/visitors`, `/vms/active-monitoring`, `/vms/reception`, `/vms/approvals`, `/vms/access-levels`, `/vms/group-registration`) pass ESLint, TypeScript typecheck, and Vitest test suites with a 100% pass rate. Verify strict compliance with the Indonesian UI dictionary (`id.ts`) and zero regressions in the production build.

**Blocked by:** 04: Pre-Registration Vertical Slice (RHF + Zod + Sonner Pilot), 06: Visitors Directory Migration to `UiDataTable`, 07: Active Monitoring Migration to `UiDataTable` & TanStack Query Polling, 08: End-to-End Type-Safe tRPC Routers for Internal Dashboard

**Status:** ready-for-agent

- [ ] Execute `pnpm lint` and ensure zero warnings or errors (with `jsx-a11y/label-has-associated-control` fully satisfied).
- [ ] Execute `pnpm typecheck` (`tsc --noEmit`) and ensure 0 TypeScript compilation errors.
- [ ] Execute `pnpm test` (`vitest run`) and ensure 100% pass rate across all test files (671+ tests).
- [ ] Verify accessibility across all form fields (proper `label[for]`, `aria-invalid`, `aria-describedby`) and data tables (accessible sorting headers, pagination roles).
- [ ] Verify that all UI strings strictly originate from `src/lib/vms/i18n/id.ts`.
- [ ] Execute `pnpm build` to verify production bundle generation without Next.js 16 build warnings.

