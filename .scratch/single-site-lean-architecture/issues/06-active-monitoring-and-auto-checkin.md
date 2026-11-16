# 06: Active Monitoring, System-Wide Overstay & Touchless Auto Check-In

**What to build:** Security operators monitor all active visitors currently on-site in a unified command screen without toggling facility views. Perimeter turnstile taps trigger touchless Fast-Track Auto Check-In within the global early arrival window. Visits exceeding the scheduled departure time plus the global overstay grace duration automatically trigger overstay alerts. Security operators can grant emergency door escalation from the complete building door list and execute forced checkout across all terminals.

**Blocked by:** 05: Reception Desk & Walk-In Intake

**Status:** ready-for-agent

- [ ] Active monitoring dashboard (`/vms/active-monitoring`) displays all checked-in visitors and perimeter alerts across the building without facility filtering.
- [ ] Perimeter turnstile access tap (`POST /api/vms/active-visits/[visitId]/tap`) triggers touchless Fast-Track Auto Check-In if the visitor arrives within `systemSettings.autoCheckInEarlyBufferMinutes` before scheduled start time.
- [ ] Security overstay detection calculates visit expiration using `systemSettings.overstayGraceMinutes` globally, flagging visits exceeding scheduled departure plus grace buffer as `OVERSTAY`.
- [ ] Emergency access modal allows operators to select and unlock perimeter doors from the complete building door list without facility scoping.
- [ ] Operator check-out and forced check-out deauthorize visitor credentials across all building terminals instantly.
- [ ] Tests verify auto check-in windows, overstay triggering, emergency escalation, and checkout operations end-to-end.

## Comments

- Commit `fe8e9ab` (ticket 04) already landed partial facility removal for this ticket: `src/app/vms/active-monitoring/` (client, columns, page, emergency-access-modal), `src/lib/vms/active-monitoring-service.ts`, and the `/api/vms/active-visits` and `/api/vms/doors` routes. This touches the boxes for the unified monitoring dashboard and the emergency access modal. Commit `20bb3c9` restored the structured 500 errors those routes lost. Remaining `facilityId` inputs live in `src/server/trpc/routers/monitoring.ts` (`listActive`, `fetchDoorTelemetry`). Verify each box against the code before building.
