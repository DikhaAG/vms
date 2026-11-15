# 08: End-to-End Type-Safe tRPC Routers for Internal Dashboard

**What to build:** Build the tRPC v11 server infrastructure under `src/server/trpc/` with context dependency injection (`vmsRepository`, facility timezone) and a Next.js App Router route handler at `src/app/api/trpc/[trpc]/route.ts`. Expose modular procedures for visitors, approvals, access levels, and active monitoring, validated via Zod schemas. Wire Client Components to tRPC React hooks (`trpc.<router>.<procedure>.useQuery / useMutation`), delivering compile-time end-to-end type safety across the operator dashboard.

**Blocked by:** 01: Core DX Dependencies, Unified Client Providers, and Test Harness, 02: Isomorphic Zod Contracts with Backward-Compatible Validation Wrappers

**Status:** ready-for-agent

- [ ] Create `src/server/trpc/trpc.ts` with tRPC initialization, procedure helpers, and error formatting.
- [ ] Create `src/server/trpc/context.ts` injecting `vmsRepository` and facility timezone.
- [ ] Create domain routers under `src/server/trpc/routers/`:
  - `visitorRouter`: search visitors, pre-register visitor, cancel pre-registration.
  - `approvalRouter`: list pending approvals, approve visit, reject visit.
  - `accessLevelRouter`: list access levels, create access level.
  - `monitoringRouter`: list active visits, fetch door telemetry, trigger emergency door unlock.
- [ ] Combine domain routers into root `appRouter` in `src/server/trpc/routers/_app.ts`.
- [ ] Create Next.js route handler at `src/app/api/trpc/[trpc]/route.ts` using `fetchRequestHandler`.
- [ ] Create typed client instance in `src/lib/trpc/client.ts`.
- [ ] Write unit tests for routers in `src/server/trpc/routers.test.ts` using `appRouter.createCaller()`.
- [ ] Verify that `pnpm check` passes with 0 warnings or errors.

