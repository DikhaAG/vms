# 02: Fast-Track Touchless Auto Check-In on First Perimeter Tap

**What to build:** Allow pre-approved visitors who have completed registration and received approval (`APPROVED` status) to scan their facial biometrics or QR code pass directly at an authorized perimeter turnstile or entry gate during their visit window. The system validates the appointment schedule, atomically transitions the visit from `APPROVED` to `CHECKED_IN`, activates live attendance monitoring, increments the tap counter to 1, and notifies the host without receptionist manual intervention.

**Blocked by:** 01: Door Topology Metadata & Implicit Room Transitions

**Status:** completed

- [x] Door tap ingestion endpoint (`POST /api/vms/active-visits/[visitId]/tap`) accepts tap requests for visits in `APPROVED` status if the target door has `isPerimeter: true`.
- [x] Validates that the tap timestamp falls within the visit scheduled window (plus configurable early arrival buffer, defaulting to 15 minutes before `visitStartTime`).
- [x] Rejects auto check-in attempts that occur before the permitted arrival buffer with a clear message instructing the visitor to wait or consult reception.
- [x] Rejects auto check-in attempts on internal non-perimeter doors (`isPerimeter: false`) while visit is still in `APPROVED` status.
- [x] On successful auto check-in, atomically updates visit status to `CHECKED_IN`, sets `checkInTimeUtc`, initializes `tapCount: 1`, logs initial `DoorTapEvent`, and creates an arrival notification for the host.
- [x] Idempotent against duplicate webhook deliveries (subsequent taps while already `CHECKED_IN` record normal door passage without resetting check-in timestamp).
- [x] Unit and route integration tests verify on-time arrival auto check-in, early arrival denial, internal door rejection, and idempotency.

