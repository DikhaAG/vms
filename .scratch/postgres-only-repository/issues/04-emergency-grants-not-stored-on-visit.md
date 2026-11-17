# 04: Emergency Access Grants never stored inside the Visit row

**What to build:** A Visit's Emergency Access Grants always come from the grants table. Saving or updating a Visit no longer writes the grants list into the Visit row, so an expired or revoked grant can never reappear on a Visit. Reading a Visit still attaches its active, unexpired grants.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Saving or updating a Visit stores no Emergency Access Grants in the Visit row
- [x] Reading a Visit (single and active list) attaches only ACTIVE, unexpired grants from the grants table
- [x] After a grant is revoked or expires, the Visit shows no grants on the next read, including Visits whose rows still hold an old copy
- [x] Verified manually against a real PostgreSQL database
- [x] Type-check, lint and `vitest run` pass

## Comments

- Implemented on branch feat/atomic-visit-transitions. A private `withoutEmergencyGrants` helper in the PostgreSQL repository drops the field:
  - in `writeVisit`, which every Visit write goes through: save, update, check-in, approval, door tap, check-out and Fast-Track
  - when a row becomes a Visit in `getVisit` and `listVisits`
  - `getVisit` and `listActiveVisits` then attach the ACTIVE, unexpired grants from `emergency_access_grants`.
- Verified manually against a throwaway PostgreSQL 18 cluster. All 13 scenarios pass:
  - Rows written by save, update and check-in hold no grants.
  - Single and active-list reads attach only the ACTIVE, unexpired grant.
  - After a revoke, the next read shows no grants.
  - A legacy row that still holds an expired grant shows no grants through `getVisit`, `listActiveVisits`, `listVisits` or `searchVisits`, and is rewritten without the copy on its next update.
  - The previous implementation failed 6 of the 13.
- Deliberate differences:
  - When a Visit has no active grants, `emergencyGrants` is now absent rather than sometimes `[]`. Every consumer checks `length > 0` or `?.length ?? 0`.
  - `listVisits` (and so `searchVisits`, `getVisitsByStatus`, `listVisitsByGroup`) no longer returns a row's stored copy, and attaches no grants. Nothing reads grants from those lists.
- Left for later:
  - The in-memory repository keeps its old grant behaviour. Ticket 06 deletes it.
