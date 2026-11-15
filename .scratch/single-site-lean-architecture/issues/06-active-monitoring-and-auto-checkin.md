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
