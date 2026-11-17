# 06: Remove the in-memory repository, mockup data and the tests that depend on it

**What to build:** The codebase contains no in-memory repository and no mockup data (fictional Hosts, Doors at Jakarta/Bali/Jayapura, test-fixture Access Levels and Visitor profiles, default lists). Every test file that constructs or relies on the in-memory repository is deleted, as is the PostgreSQL repository suite that mocks Drizzle's query-builder chain. The global test setup no longer mocks the repository. Tests that do not touch the repository stay and pass, so the CI test step still runs. The application keeps reading only PostgreSQL, unchanged.

**Blocked by:** 01, 02, 03, 04, 05

**Status:** ready-for-agent

- [x] No in-memory repository class or mockup data constants remain anywhere in the source tree
- [x] All test files depending on the in-memory repository, and the Drizzle-mock repository suite, are deleted
- [x] The global test setup has no repository mock
- [x] Remaining suites (contracts, timezone, face normaliser, localisation, validation helpers, route errors, settings defaults, database schema/client, repository-free HikCentral adapters) pass under `vitest run`
- [x] Type-check and lint pass; `next build` still succeeds without DATABASE_URL

## Comments

- Implemented on branch feat/atomic-visit-transitions.
  - `InMemoryVmsRepository` and every mockup constant (`TEST_FIXTURE_*`, `DEFAULT_HOSTS`, `DEFAULT_DOORS`, `DEFAULT_ACCESS_LEVELS`, `DEFAULT_VISITOR_PROFILES`) are gone from `repository.ts`. What remains is the interface (removed in ticket 07) and the `defaultVmsRepository` singleton, which always builds `PostgresVmsRepository`.
  - `src/test/setup.ts` no longer mocks the repository.
  - Deleted wholesale: every suite that imported `InMemoryVmsRepository`, `TEST_FIXTURE_*` or `defaultVmsRepository` (repository, service, door/host adapter, tRPC router, e2e quality-gate/tracer-bullet/access-enhancement, and the API route suites that seeded the repo), the Drizzle-mock `postgres-repository.test.ts`, plus `reception-client.test.tsx` and `api/trpc/[trpc]/route.test.ts`, whose every case hit the repo.
  - Twelve suites relied on the repo only through the removed global mock (server page renders, route handlers on the success path). Only the cases that queried the repo were removed; their repo-free cases (validation 400s, component renders) stay, per "Tests that do not touch the repository stay and pass".
  - Also removed the fictional stub Hosts (Budi Santoso, Siti Rahma, Rudi Host) from `syncHikCentralHosts` stub mode, which wrote them to PostgreSQL via `POST /api/vms/sync/hosts {mode:"stub"}`. Stub success now returns zero Hosts and writes nothing; covered by a route test.
  - Verified: `tsc --noEmit` and `eslint` clean; `vitest run` 57 files / 513 tests pass (was 846); `next build` exits 0 with `DATABASE_URL` unset and no `.env.local`.
- Left on purpose:
  - `STUB_PRIVILEGE_GROUPS` (`acc-jkt-*`) in `hikcentral-access-level-adapter.ts`: a HikCentral stub-mode fixture that is never written to the repository and whose only caller is unused in production code.
  - ADR 0006 / 0010 mentions of `InMemoryVmsRepository` and `DEFAULT_DOORS`: historical records.
- Still open: `CODING_STANDARDS.md` ("Isolate repository persistence behind clean interfaces") still justifies the interface by "lightweight in-memory stores during fast TDD cycles", which no longer exist. Best resolved alongside ticket 07.
