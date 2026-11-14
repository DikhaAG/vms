# 01: PostgreSQL Database Integration with Drizzle ORM & PostgresVmsRepository

**What to build:** Install and configure Drizzle ORM and the PostgreSQL client (`pg`, `@types/pg`). Define the complete relational schema (`facilities`, `facility_doors`, `access_levels`, `host_employees`, `visitor_profiles`, `visits`, `invitation_tokens`, `emergency_grants`, `audit_events`). Implement auto-migration on boot (`initPostgresDb()`) and build `PostgresVmsRepository` implementing `IVmsRepository`. Wire `defaultVmsRepository` to dynamically resolve PostgreSQL when `DATABASE_URL` is set, with graceful error diagnostics.

**Blocked by:** none

**Status:** done

- [x] Install `drizzle-orm`, `pg`, `@types/pg` and `drizzle-kit` dev dependency.
- [x] Create `src/lib/db/schema.ts` defining all VMS tables with proper constraints, indices, and JSON columns for arrays.
- [x] Create `src/lib/db/client.ts` establishing the pooled connection and schema initialization helper (`initPostgresDb`).
- [x] Implement `PostgresVmsRepository` in `src/lib/vms/postgres-repository.ts` implementing `IVmsRepository`.
- [x] Add unit and integration tests verifying CRUD operations, visit status updates, biometric retention, and token consumption against the repository interface.
- [x] Wire `src/lib/vms/repository.ts` to instantiate `PostgresVmsRepository` when `DATABASE_URL` is provided.

## Comments
- Implemented PostgreSQL repository with Drizzle ORM and hybrid document-relational indexing pattern.
- Unit and integration tests pass (src/lib/db/schema.test.ts, src/lib/db/client.test.ts, src/lib/vms/postgres-repository.test.ts, src/lib/vms/repository.test.ts).

