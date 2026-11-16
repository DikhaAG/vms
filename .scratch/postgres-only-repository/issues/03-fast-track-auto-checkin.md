# 03: Correct Fast-Track Auto Check-In

**What to build:** When an approved Visitor scans at a Perimeter Door inside the appointment window, the PostgreSQL repository performs the Fast-Track Auto Check-In the way the Visit rules require. It writes one inbound tap event (perimeter flag defaulting to true when the Door is unknown), one check-in audit event naming the system as operator (`system-auto-checkin`, "Touchless Perimeter Fast-Track"), biometric verification and the Door in the note, the optional Host arrival notification, and updates the Visit to CHECKED_IN with check-in time, tap count exactly 1, last seen Door and the fast-track flag. If the Visit is already CHECKED_IN or OVERSTAY, nothing is written and the existing Visit and matching tap are returned. All writes happen in one transaction. The repository no longer delegates to the door-tap method for this path.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] A Fast-Track Auto Check-In creates a check-in audit event visible in the check-in audit list for that Visit
- [ ] The Visit is CHECKED_IN, marked fast-tracked, and has a tap count of exactly 1 regardless of its previous count
- [ ] A second perimeter scan on an already checked-in or Overstay Visit changes nothing and does not reset the check-in time
- [ ] The Host arrival notification, when supplied, is saved
- [ ] Visit, tap, audit event and notification persist together or not at all
- [ ] Active monitoring shows the fast-tracked Visit as before (manual check against a real PostgreSQL database)
- [ ] Type-check, lint and `vitest run` pass
