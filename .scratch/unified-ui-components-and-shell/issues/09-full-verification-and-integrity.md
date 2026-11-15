# 09: Full Verification, Anti-Regression, & E2E Visual Integrity Pass

**What to build:** Comprehensive verification of the entire application across all 7 operational routes, ensuring zero TypeScript errors, zero ESLint warnings, 100% test passing rate across the entire test suite (631+ tests across 80+ test files), verified responsive layout without horizontal overflow on mobile viewports, and clean git working tree.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle, 03: Reception Desk Migration, 04: Approvals Queue Migration, 05: Pre-Registration & Self-Invite Form Migration, 06: Group Registration Migration, 07: Access Levels Master Migration, 08: Visitors Directory & PDP Archive Migration

**Status:** claimed

- [ ] `pnpm lint` runs with 0 errors and 0 warnings.
- [ ] `pnpm typecheck` runs with 0 type errors.
- [ ] `pnpm test` runs all 80+ test suites with 100% pass rate.
- [ ] End-to-end Indonesian shell suite (`src/test/e2e-ui-indonesian-shell.test.tsx`) passes completely.
- [ ] Hardware production integrity suite (`src/test/production-integrity.test.ts`) passes completely.
- [ ] Mobile responsive layout verified with zero horizontal overflow on small screen viewports.
- [ ] Working tree is clean and ready for review and commit.

