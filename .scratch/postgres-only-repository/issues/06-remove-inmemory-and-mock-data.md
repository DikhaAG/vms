# 06: Remove the in-memory repository, mockup data and the tests that depend on it

**What to build:** The codebase contains no in-memory repository and no mockup data (fictional Hosts, Doors at Jakarta/Bali/Jayapura, test-fixture Access Levels and Visitor profiles, default lists). Every test file that constructs or relies on the in-memory repository is deleted, as is the PostgreSQL repository suite that mocks Drizzle's query-builder chain. The global test setup no longer mocks the repository. Tests that do not touch the repository stay and pass, so the CI test step still runs. The application keeps reading only PostgreSQL, unchanged.

**Blocked by:** 01, 02, 03, 04, 05

**Status:** ready-for-agent

- [ ] No in-memory repository class or mockup data constants remain anywhere in the source tree
- [ ] All test files depending on the in-memory repository, and the Drizzle-mock repository suite, are deleted
- [ ] The global test setup has no repository mock
- [ ] Remaining suites (contracts, timezone, face normaliser, localisation, validation helpers, route errors, settings defaults, database schema/client, repository-free HikCentral adapters) pass under `vitest run`
- [ ] Type-check and lint pass; `next build` still succeeds without DATABASE_URL
