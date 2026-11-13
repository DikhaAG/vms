# 07: Active Visit Dashboard, Door Tap Quota Enforcement, Overstay Alert & Check-out

**What to build:** An active attendance dashboard and security enforcement monitor. Security personnel can monitor all checked-in visitors currently on-premise, their entry times, authorized zones, and cumulative door tap counts (tracked against physical HikCentral door events via `POST /artemis/api/acs/v1/door/events`). When a visitor exceeds their allocated Tap Quota or remains on site beyond their scheduled visit window plus the facility's Overstay Grace Period, an Overstay alert badge appears and alerts security. The Receptionist or Security Officer can click "Check-out" or "Force Check-out", triggering `POST /artemis/api/visitor/v1/visitor/out`, which immediately revokes all terminal permissions and access privileges across physical hardware.

**Blocked by:** 06: Front-Desk Receptionist Walk-in & Fast Check-in

**Status:** resolved

- [x] Active visitor dashboard listing all guests currently on site with duration, host details, and tap counts.
- [x] Tap quota tracking engine pulling or processing door events from `acs/v1/door/events`, automatically triggering check-out when the quota is reached.
- [x] Overstay detection engine comparing current facility wall-clock time against `visitEndTime + overstayGracePeriod`, displaying an Overstay alert badge.
- [x] Check-out adapter calling `POST /artemis/api/visitor/v1/visitor/out` with `appointRecordId`, verifying revocation of terminal privileges.
- [x] Receptionist / Security UI actions for manual Check-out and Force Check-out with reason prompt.
- [x] Tests covering overstay calculation, quota exhaustion trigger, check-out execution, and hardware de-authorization.

## Comments

- Implemented isomorphic contracts and pure functions in `src/lib/vms/checkout-contract.ts` for overstay calculation, tap quota validation, and checkout input validation.
- Extended `IVmsRepository` and `InMemoryVmsRepository` in `src/lib/vms/repository.ts` with `listActiveVisits`, `recordDoorTap`, `listDoorTapEvents`, `checkOutVisit`, and `listCheckOutEvents`.
- Implemented HikCentral checkout adapter in `src/lib/vms/hikcentral-checkout-adapter.ts` with Artemis HMAC signature dispatch to `POST /artemis/api/visitor/v1/visitor/out`.
- Built `ActiveMonitoringService` in `src/lib/vms/active-monitoring-service.ts` enforcing tap quotas and auto-checkout upon quota exhaustion.
- Created Next.js API route handlers:
  - `GET /api/vms/active-visits`
  - `POST /api/vms/active-visits/[visitId]/check-out`
  - `POST /api/vms/active-visits/[visitId]/tap`
- Developed active attendance & security dashboard in `src/app/vms/active-monitoring/page.tsx` and `active-monitoring-client.tsx` with summary KPIs, overstay badges, tap progress bar, turnstile tap simulation, one-click checkout, and modal forced check-out with reason prompt.
- Verified 100% test coverage with 42 test suites, 327 passing unit and route tests, and zero type or lint errors.

