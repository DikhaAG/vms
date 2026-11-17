# 08: Atomic Walk-in check-in

**What to build:** When a Receptionist registers a Walk-in and checks the Visitor in, the new Visit and its check-in audit event are created by one repository method in one transaction. The check-in module no longer sequences the two writes itself. Every Walk-in therefore has an audit record, and a failure leaves no half-created Visit.

**Blocked by:** 07

**Status:** ready-for-agent

- [x] A Walk-in check-in creates the Visit and its check-in audit event through a single repository method
- [x] Both writes persist together or not at all
- [x] The Walk-in audit event keeps today's fields (Receptionist, verification method defaulting to ID card, notes)
- [x] Reception Walk-in flow works end to end against a real PostgreSQL database
- [x] Type-check, lint and `vitest run` pass

## Comments

- Implemented on branch feat/atomic-visit-transitions.
  - New `checkInWalkIn(visit, params)` on `PostgresVmsRepository` writes the Visit and its check-in audit event in one transaction (Visit first). It takes the Visit without `status` / `actualCheckInTimeUtc` and sets them itself, so only the repository can mark a Walk-in checked in.
  - `CheckInWalkInParams` (check-in time, Receptionist id and name, verification method, notes) sits beside the class. The verification method still defaults to `id_card`, now in the repository.
  - `CheckInService.createWalkInVisit` makes one repository call instead of `saveVisit` + `saveCheckInEvent`. The public `saveCheckInEvent` is deleted: it had no other callers, and keeping it would let a caller skip the atomic path.
  - Verified manually against a throwaway PostgreSQL 18 cluster through `POST /api/vms/check-in/walk-in` (HikCentral stub mode), 12/12 checks: CHECKED_IN Visit, exactly one audit event, Receptionist / notes / method kept (default `id_card`, explicit `biometric`), audit time equals Visit check-in time. A forced CHECK failure on the audit insert leaves no Visit; one on the Visit insert leaves no audit event. Against the previous code, "failing audit write leaves no Visit" failed (a half-created Visit remained).
  - Not exercised: the Reception modal in the browser, because it always calls HikCentral in live mode.
  - `tsc --noEmit`, `eslint` and `vitest run` (57 files / 513 tests) pass.
- Left open (review notes, out of scope):
  - `checkInWalkIn` and `checkInVisit` build the audit event the same way; a shared builder could serve both.
  - `writeVisit` is an upsert, so a colliding `vis-walkin-…` id would overwrite an existing Visit rather than fail. This predates the change.
