# Status: ready-for-agent

# Spec: Postgres-Only Repository

## Problem Statement

The VMS already persists every Visit, Door, Access Level, Host and audit event in PostgreSQL (ADR-0006). No page or API route reads anything else. The codebase still carries a second, in-memory implementation of the whole VMS repository, plus mockup data that names fictional employees and doors at sites that no longer exist (Jakarta, Bali, Jayapura; ADR-0010 made the deployment single-Site).

That second implementation causes three problems for the owner of the system:

1. **Confusion about what is real.** Mockup Hosts ("Budi Santoso", "Siti Rahma") and mockup Doors live next to production code. Someone reading the code cannot tell whether the operators see real PostgreSQL data or mockup data.
2. **Two copies of the Visit rules that no longer agree.** Check-in, check-out, door taps, Fast-Track Auto Check-In and approval decisions are coded twice, once per implementation. The copies have drifted. The production (PostgreSQL) copy has bugs that the in-memory copy does not:
   - A Fast-Track Auto Check-In in production records no check-in audit event and does not mark the Visit as fast-tracked. Security has no audit record of how the Visitor entered.
   - If HikCentral delivers the same door tap event twice, production fails with a duplicate-key error instead of ignoring the repeat.
   - A Fast-Track Auto Check-In in production counts its own tap on top of the existing tap count, so the Tap Quota starts from the wrong number.
3. **A 61-method repository interface that exists only so the in-memory copy can stand in for PostgreSQL.** With one real implementation, that interface is ceremony every service has to import.

There are also two data-integrity faults in the production repository:

- A transition writes the Visit and its audit event as two separate statements. If the second write fails, the audit trail and the Visit status disagree.
- Reading a Visit attaches its active Emergency Access Grants. Saving that Visit writes the grants back into the Visit row, where they go stale after the grants expire or are revoked.

## Solution

The VMS has exactly one repository: the PostgreSQL one. The in-memory repository, its mockup data, the tests that depended on it, and the shared repository interface are deleted. Services and tRPC context depend on the PostgreSQL repository directly.

Before the in-memory copy is deleted, the production repository is corrected so that check-in, Fast-Track Auto Check-In and door taps behave the way the Visit rules require. Each Visit transition writes the Visit and its audit events in a single database transaction. Emergency Access Grants are never persisted inside the Visit row.

From the operator's point of view nothing changes on screen, except that Fast-Track entries now appear in the check-in audit trail, and repeated HikCentral tap events no longer cause errors.

## User Stories

1. As the system owner, I want the codebase to contain only the PostgreSQL repository, so that I know every screen shows real data.
2. As the system owner, I want all mockup Hosts, Doors, Access Levels and Visitor profiles removed from the code, so that fictional records can never reach production.
3. As a developer, I want services to depend on the PostgreSQL repository directly, so that I do not have to maintain a 61-method interface for a single implementation.
4. As a developer, I want the tests that only exercised the in-memory repository removed, so that the suite stops describing behaviour production does not have.
5. As a developer, I want the tests that do not touch the database (contracts, timezone, face normalisation, localisation, validation helpers) kept, so that the CI test step still runs and still guards those rules.
6. As a Security Officer, I want every Fast-Track Auto Check-In to create a check-in audit event, so that I can see when and through which Perimeter Door the Visitor entered.
7. As a Security Officer, I want a Fast-Track Auto Check-In audit event to name the system as the operator and the biometric scan as the verification method, so that I can tell it apart from a Receptionist check-in.
8. As a Receptionist, I want a fast-tracked Visit to be marked as fast-tracked, so that active monitoring shows the Visitor skipped the front desk.
9. As a Security Officer, I want a Fast-Track Auto Check-In to set the tap count to one, so that the Tap Quota starts from the entry tap only.
10. As a Security Officer, I want a Fast-Track Auto Check-In on a Visit that is already checked in or in Overstay to change nothing, so that a second perimeter scan does not reset the check-in time.
11. As a Security Officer, I want a repeated HikCentral door tap event (same event id, or same time, Door and direction) to be ignored, so that the gateway can retry delivery without errors or double-counting.
12. As a Security Officer, I want a repeated door tap to return the Visit's existing tap count, so that the Tap Quota check after a retry gives the same answer as the first time.
13. As a Security Officer, I want a door tap to be matched to a Door by its index code, or by its name when the code is unknown, so that the Door's directionality and perimeter flag are recorded on the tap.
14. As a Security Officer, I want implicit taps (Implicit Room Transition) not to count against the Tap Quota, so that leaving a Single-Direction room is not charged as an entry.
15. As a Security Officer, I want a check-in to save the Visit status and the check-in audit event together or not at all, so that the audit trail never shows a check-in that did not happen.
16. As a Security Officer, I want a check-out to save the Visit status and the check-out audit event together or not at all, so that a forced check-out is always recorded.
17. As an Approver, I want an approval decision to save the Visit status and the approval record together or not at all, so that every approved or rejected Visit has its decision record.
18. As a Security Officer, I want a door tap to save the tap event and the updated Visit (tap count, last seen Door) together or not at all, so that the tap count always matches the stored taps.
19. As a Security Officer, I want a Fast-Track Auto Check-In to save the Visit, the tap event, the check-in audit event and the Host arrival notification together or not at all, so that a half-finished auto check-in is impossible.
20. As a Receptionist, I want a Walk-in check-in to save the new Visit and its check-in audit event together or not at all, so that every Walk-in has an audit record.
21. As a Security Officer, I want a Visit's Emergency Access Grants always read from the grants table, so that an expired or revoked grant never reappears on the Visit.
22. As a Security Officer, I want saving a Visit to never store its Emergency Access Grants inside the Visit row, so that the Visit row cannot hold a stale copy.
23. As a Receptionist, I want the visitor profile list to show how many Visits each profile has, so that I can spot returning Visitors.
24. As a Receptionist, I want visitor profile search to match on email as well as name, identity number and phone, so that I can find a Visitor by any contact detail.
25. As a Receptionist, I want saving a visitor profile with an identity number that already exists to replace the old profile, not create a duplicate, so that one Visitor has one profile.
26. As a developer, I want the application to fail loudly when DATABASE_URL is missing, as it already does, so that nobody mistakes a broken setup for an empty database.

## Implementation Decisions

- **Single repository.** The PostgreSQL repository is the only repository module. The in-memory repository class and all mockup data constants (test fixture Access Levels, Visitor profiles, Doors, default Hosts, default empty lists) are deleted.
- **No shared repository interface.** The repository interface type and its parameter types move to (or are re-declared beside) the PostgreSQL repository. Every service, both HikCentral adapters that take a repository, and the tRPC context type their dependency as the PostgreSQL repository class. Constructor injection stays as it is: services still receive the repository as a constructor argument; only the type changes.
- **Composition root.** The process-wide repository singleton (`defaultVmsRepository` and its factory) stays, now constructing the PostgreSQL repository with no alternative. Lazy database connection on first query stays, so `next build` still works without DATABASE_URL.
- **Rules stay in the repository.** Visit transitions (check-in, check-out, door tap, Fast-Track Auto Check-In, approval decision) remain methods of the PostgreSQL repository. No separate Visit Lifecycle module is introduced: with one implementation there is no duplication to remove, and the owner does not want a test seam.
- **Corrected production behaviour, taken from the in-memory copy before it is deleted:**
  - *Door tap*: before inserting, look for an existing tap on the same Visit with the same event id, or the same tapped-at time, Door index code and direction. If one exists, return it with the Visit and its current tap count and write nothing. Resolve the Door by index code, falling back to a case-insensitive name match. Implicit taps add zero to the tap count; other taps add one.
  - *Fast-Track Auto Check-In*: if the Visit is already CHECKED_IN or OVERSTAY, return the Visit and the matching existing tap unchanged. Otherwise write one inbound tap event (perimeter flag defaulting to true when the Door is unknown), one check-in audit event (operator id `system-auto-checkin`, verification method biometric, a note naming the Door), the optional Host arrival notification, and update the Visit to CHECKED_IN with check-in time, tap count exactly 1, last seen Door, and the fast-track flag set. It no longer delegates to the door-tap method.
  - *Visitor profiles*: listing computes each profile's Visit count (Visits sharing the identity number) and searches email too. Saving a profile removes any other profile with the same identity number.
  - *Host notifications*: listing returns newest first.
- **Atomic transitions.** Every multi-write operation runs inside one Drizzle transaction: check-in, check-out, door tap, Fast-Track Auto Check-In, approval decision. The Walk-in path in the check-in service, which today calls save-Visit and save-check-in-event separately, moves into one repository method that does both in one transaction. Row locking against concurrent taps is not added (see Out of Scope).
- **Emergency Access Grants are read-only on the Visit.** The save-Visit path strips the grants field before writing the Visit row. Reading a Visit keeps attaching the active, unexpired grants from the grants table. Existing rows that already contain a grants copy are harmless: the read path overwrites the field.
- **Test setup.** The global test setup no longer mocks the repository module with an in-memory instance.
- **ADR alignment.** This completes ADR-0006 ("Pure Production VMS") by removing the last in-memory artefact, and ADR-0010 by removing multi-site mockup Doors. No ADR is contradicted. An ADR recording "no in-memory repository and no repository test double" is optional; the owner has chosen not to keep a test seam.

## Testing Decisions

- **Owner's decision: no repository tests.** The owner does not want tests for the repository or for the services that depend on it. No contract suite, no PGlite, no test database.
- **Deleted:** every test file that constructs or relies on the in-memory repository (the repository suite, the service suites for check-in, active monitoring, approval, group, invitation, pre-registration, self-registration and access levels, the HikCentral door and host adapter suites, the tRPC router suite, the end-to-end quality-gate suite), and the PostgreSQL repository suite that mocks Drizzle's query-builder chain.
- **Kept:** tests that do not touch the repository: Zod contract suites, timezone, face normaliser, localisation dictionary, validation helpers, route errors, Site and System Settings defaults, database schema and client suites, and HikCentral adapter suites that do not need a repository. These keep `vitest run` (the CI test step) meaningful and non-empty.
- **What a good test is here (for the kept suites):** it checks external behaviour through the module's interface (inputs to outputs, thrown errors), not internal call shapes. The deleted Drizzle-mock suite is the counter-example: it asserted which builder methods were called.
- **Verification for this change:** type-check passes; `vitest run` passes on the remaining suites; lint passes; and a manual run against the real PostgreSQL database confirms that a Receptionist check-in, a check-out, a door tap and a Fast-Track Auto Check-In each produce the expected Visit status and audit rows, and that replaying the same tap is ignored.

## Out of Scope

- Row-level locking (`SELECT … FOR UPDATE`) to stop concurrent taps from losing a tap-count increment. The transaction in this spec makes each transition all-or-nothing, but two simultaneous taps can still read the same count. That is a follow-up.
- Moving Visit rules into a separate Visit Lifecycle module.
- Collapsing the Visit query methods (list, by status, active, search, by group) or the three Door lookup methods into fewer methods, and pushing their filtering into SQL.
- Database migrations or schema changes. The tables stay as they are.
- Changes to Implicit Room Transition or Tap-Quota auto check-out decisions in active monitoring.
- Any UI change.

## Further Notes

- Production already reads only PostgreSQL. Deleting the in-memory repository and the mockup data changes no data an operator sees.
- Order matters: port the corrected behaviour into the PostgreSQL repository **before** deleting the in-memory class, because the in-memory class is the only written record of the intended Fast-Track and tap-retry rules.
- The behaviour corrections (Fast-Track audit event, tap retry, tap count of 1) change production behaviour on purpose. Call them out in the PR description.
- Work happens on a feature branch, not on `main`.
