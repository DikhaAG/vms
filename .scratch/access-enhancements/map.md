# Access Enhancements Task Map

Task graph for Fast-Track Auto Check-In, Time-Bounded Emergency Access, and Door Directionality Tracking.

## Notes & Decisions
- Built on top of VMS foundational architecture: ADR 0001 (Hybrid State & HikCentral Engine), ADR 0002 (Facility Timezone & UTC Storage), and ADR 0004 (Biometric Retention).
- Seam Strategy: Extend existing `POST /api/vms/active-visits/[visitId]/tap` for auto check-in and implicit transitions, and add `POST /api/vms/active-visits/[visitId]/emergency-access` for time-bounded privilege escalation.
- Strict Anti-Corruption Layer: All upstream HikCentral OpenAPI parameters remain isolated within `src/lib/vms/hikcentral-*-adapter.ts`.

## Tickets

| Number | Slug | Status | Blocked By | Frontier |
|---|---|---|---|---|
| 01 | [01-door-topology-and-implicit-transitions.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/access-enhancements/issues/01-door-topology-and-implicit-transitions.md) | resolved | None | Done |
| 02 | [02-fast-track-touchless-auto-checkin.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/access-enhancements/issues/02-fast-track-touchless-auto-checkin.md) | resolved | 01 | Done |
| 03 | [03-emergency-access-escalation.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/access-enhancements/issues/03-emergency-access-escalation.md) | resolved | 01 | Done |
| 04 | [04-active-monitoring-and-emergency-ui.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/access-enhancements/issues/04-active-monitoring-and-emergency-ui.md) | resolved | 02, 03 | Done |
| 05 | [05-e2e-integration-and-hardware-resilience.md](file:///Users/a69/Desktop/DESKTOP/TAM/vms/.scratch/access-enhancements/issues/05-e2e-integration-and-hardware-resilience.md) | resolved | 04 | Done |

## Frontier
- All 5 tickets in the task graph are resolved.
- Ready for full code review and spec completion verification.
