# 07: Active Visit Dashboard, Door Tap Quota Enforcement, Overstay Alert & Check-out

**What to build:** An active attendance dashboard and security enforcement monitor. Security personnel can monitor all checked-in visitors currently on-premise, their entry times, authorized zones, and cumulative door tap counts (tracked against physical HikCentral door events via `POST /artemis/api/acs/v1/door/events`). When a visitor exceeds their allocated Tap Quota or remains on site beyond their scheduled visit window plus the facility's Overstay Grace Period, an Overstay alert badge appears and alerts security. The Receptionist or Security Officer can click "Check-out" or "Force Check-out", triggering `POST /artemis/api/visitor/v1/visitor/out`, which immediately revokes all terminal permissions and access privileges across physical hardware.

**Blocked by:** 06: Front-Desk Receptionist Walk-in & Fast Check-in

**Status:** ready-for-agent

- [ ] Active visitor dashboard listing all guests currently on site with duration, host details, and tap counts.
- [ ] Tap quota tracking engine pulling or processing door events from `acs/v1/door/events`, automatically triggering check-out when the quota is reached.
- [ ] Overstay detection engine comparing current facility wall-clock time against `visitEndTime + overstayGracePeriod`, displaying an Overstay alert badge.
- [ ] Check-out adapter calling `POST /artemis/api/visitor/v1/visitor/out` with `appointRecordId`, verifying revocation of terminal privileges.
- [ ] Receptionist / Security UI actions for manual Check-out and Force Check-out with reason prompt.
- [ ] Tests covering overstay calculation, quota exhaustion trigger, check-out execution, and hardware de-authorization.

## Comments

