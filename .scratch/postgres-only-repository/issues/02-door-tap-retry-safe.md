# 02: Retry-safe, atomic door taps

**What to build:** When HikCentral delivers a door tap for an active Visit, the PostgreSQL repository records it once. A repeat of the same tap (same event id, or same tapped-at time, Door index code and direction) is ignored and returns the existing tap with the Visit's current tap count, so gateway retries neither fail nor double-count against the Tap Quota. The tap is matched to a Door by index code, falling back to a case-insensitive Door name, so directionality and the Perimeter Door flag are recorded. Implicit taps (Implicit Room Transition) add nothing to the tap count. The tap event and the updated Visit (tap count, last seen Door) are saved in one transaction.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Replaying a tap with the same event id writes nothing and returns the original tap and unchanged tap count
- [ ] Replaying a tap with no id but the same time, Door and direction writes nothing and returns the original tap
- [ ] A tap whose Door index code is unknown but whose Door name matches (case-insensitive) records that Door's access type and perimeter flag
- [ ] An implicit tap is stored but does not increase the tap count; a normal tap increases it by one
- [ ] The tap event and the Visit update persist together or not at all
- [ ] Verified manually against a real PostgreSQL database
- [ ] Type-check, lint and `vitest run` pass
