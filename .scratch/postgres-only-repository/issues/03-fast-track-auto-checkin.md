# 03: Correct Fast-Track Auto Check-In

**What to build:** When an approved Visitor scans at a Perimeter Door inside the appointment window, the PostgreSQL repository performs the Fast-Track Auto Check-In the way the Visit rules require. It writes one inbound tap event (perimeter flag defaulting to true when the Door is unknown), one check-in audit event naming the system as operator (`system-auto-checkin`, "Touchless Perimeter Fast-Track"), biometric verification and the Door in the note, the optional Host arrival notification, and updates the Visit to CHECKED_IN with check-in time, tap count exactly 1, last seen Door and the fast-track flag. If the Visit is already CHECKED_IN or OVERSTAY, nothing is written and the existing Visit and matching tap are returned. All writes happen in one transaction. The repository no longer delegates to the door-tap method for this path.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [x] A Fast-Track Auto Check-In creates a check-in audit event visible in the check-in audit list for that Visit
- [x] The Visit is CHECKED_IN, marked fast-tracked, and has a tap count of exactly 1 regardless of its previous count
- [x] A second perimeter scan on an already checked-in or Overstay Visit changes nothing and does not reset the check-in time
- [x] The Host arrival notification, when supplied, is saved
- [x] Visit, tap, audit event and notification persist together or not at all
- [x] Active monitoring shows the fast-tracked Visit as before (manual check against a real PostgreSQL database)
- [x] Type-check, lint and `vitest run` pass

## Comments

- Implemented on branch feat/atomic-visit-transitions. Verified manually against a throwaway PostgreSQL 18 cluster:
  - A fresh Fast-Track writes the tap, audit event, notification and Visit. A previous tap count of 5 becomes 1, and an unknown Door is treated as a Perimeter Door.
  - Door name fallback works.
  - A second scan on a CHECKED_IN or OVERSTAY Visit writes nothing and keeps the check-in time.
  - A forced CHECK-constraint failure on the Visit write rolls back all four writes.
  - Five concurrent deliveries with the same event id produce one tap, one audit event and one notification.
  - The same event id on another Visit throws.
  - End to end through active monitoring, the Visit shows `isFastTrack` and a tap count of 1.
  - The verification script failed 7 of 9 scenarios against the previous implementation.
- Deliberate differences from the in-memory reference:
  - A no-op scan returns no notification, because none was saved.
  - The no-op's matching tap is found by event id, or by the same time, Door and direction. It falls back to the Visit's earliest tap.
  - The audit note reads "Fast-Track auto check-in at Perimeter Door: …" (glossary term). The operator name stays "Touchless Perimeter Fast-Track", as this ticket specifies.
- Still open (out of scope per spec, which defers row locking): the CHECKED_IN/OVERSTAY guard runs before the transaction. Two simultaneous scans with *different* event ids can both check in, and the later one resets the check-in time. Closing this needs a conditional status update or `SELECT … FOR UPDATE`.
