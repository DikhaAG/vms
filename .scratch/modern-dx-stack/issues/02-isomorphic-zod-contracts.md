# 02: Isomorphic Zod Contracts with Backward-Compatible Validation Wrappers

**What to build:** Declare canonical Zod validation schemas across `src/lib/vms/*-contract.ts` (`vms-contract.ts`, `access-level-contract.ts`, `approval-contract.ts`, `checkin-contract.ts`, `checkout-contract.ts`, `group-contract.ts`, `invitation-contract.ts`) with types derived via `z.infer`. Provide backward-compatible wrapper functions (`validatePreRegistrationInput`, `validateAccessLevelInput`, etc.) that delegate to `schema.safeParse()`, keeping all existing services and test files functional while making validation schemas available to React Hook Form and tRPC.

**Blocked by:** 01: Core DX Dependencies, Unified Client Providers, and Test Harness

**Status:** ready-for-human

- [x] Define canonical Zod schemas for pre-registration, visitors, access levels, approvals, check-in, check-out, and invitations in `src/lib/vms/*-contract.ts`.
- [x] Export derived TypeScript types using `z.infer<typeof schema>`.
- [x] Ensure all contract modules remain strictly isomorphic: zero `node:*` imports and zero `process.env` reads.
- [x] Maintain existing validation functions as backward-compatible wrappers delegating to `schema.safeParse()`, outputting `{ valid: boolean, errors: Record<string, string> }`.
- [x] Verify that all existing contract test suites (`*-contract.test.ts`) pass without changes.
- [x] Verify that `pnpm check` passes with 0 warnings or errors.

