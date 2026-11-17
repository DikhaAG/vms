# 07: Remove the shared repository interface

**What to build:** With one repository left, the 61-method repository interface is deleted. Every service, the HikCentral adapters that take a repository, and the tRPC context depend on the PostgreSQL repository type directly. Constructor injection stays; only the type changes. The repository's parameter and result types live beside the PostgreSQL repository. The process-wide repository singleton keeps constructing the PostgreSQL repository with lazy connection.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] The shared repository interface no longer exists
- [x] All former users of the interface reference the PostgreSQL repository type
- [x] The default repository singleton still works and still connects lazily
- [x] Type-check, lint, `vitest run` and `next build` pass

## Comments

- Implemented on branch feat/atomic-visit-transitions.
  - `IVmsRepository` is deleted. `repository.ts` is now only the composition root: `createVmsRepository()` and `defaultVmsRepository`, both typed `PostgresVmsRepository`, with the `globalThis` cache unchanged. The redundant `export { PostgresVmsRepository }` re-export is dropped; nothing imported the class through it.
  - `ListVisitsFilter`, `UpdateVisitApprovalParams`, `CheckInVisitParams`, `CheckOutVisitParams` and `RecordDoorTapResult` moved unchanged into `postgres-repository.ts`; the class no longer has `implements`.
  - All ten services/adapters and `src/server/trpc/context.ts` import `type { PostgresVmsRepository }` from `./postgres-repository`. Constructor parameters and their `defaultVmsRepository` defaults are unchanged.
  - Verified: `tsc --noEmit` and `eslint` clean; `vitest run` 57 files / 513 tests pass; `next build` exits 0 with `DATABASE_URL` unset (lazy `db` getter untouched).
- Still open: `CODING_STANDARDS.md` ("Isolate repository persistence behind clean interfaces") still prescribes the interface this ticket removed. Rewording it is the owner's call; both code-review axes flagged it.
