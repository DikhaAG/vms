# 01: Atomic Visit transitions for check-in, check-out and approval decisions

**What to build:** When a Receptionist checks in a Visit, an operator checks out a Visit (normal or forced), or an Approver decides on a Visit, the PostgreSQL repository saves the Visit status and its audit record (check-in audit event, check-out audit event, or approval record) in one database transaction. If any write fails, none of them persist, so the audit trail never disagrees with the Visit status. This ticket also establishes the transaction pattern later tickets reuse.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A Receptionist check-in writes the CHECKED_IN Visit and its check-in audit event in one transaction
- [x] A check-out (normal and forced) writes the CHECKED_OUT Visit and its check-out audit event in one transaction
- [x] An approval decision writes the new Visit status and the approval record in one transaction
- [x] A failure in the second write leaves neither write persisted (verified manually against a real PostgreSQL database, e.g. by forcing a constraint error)
- [x] Visit-not-found still throws the same error as today
- [x] Type-check, lint and `vitest run` pass

## Comments

- Landed in c711566 on branch feat/atomic-visit-transitions. All acceptance boxes done; rollback verified manually against a throwaway PostgreSQL DB by forcing a CHECK-constraint failure on the Visit upsert.
