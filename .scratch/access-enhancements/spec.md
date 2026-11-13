# Spec: Fast-Track Auto Check-In, Emergency Access Escalation, and Door Topology Tracking

Status: ready-for-agent

## Problem Statement

While the enterprise Visitor Management System successfully manages pre-registration, biometric photo normalization, approval screening, dynamic access level bundling, reception check-in, tap quota enforcement, and check-out, operational realities on physical site introduce three critical frictions:

1. **Reception Bottleneck for Pre-Approved Visitors:** Visitors who have completed external self-registration with valid biometrics and received managerial approval are still forced to physically wait at the reception desk for a staff member to click "Check In". This slows down high-volume lobby turnstiles and prevents seamless touchless entry.
2. **Inflexible Ad-Hoc Access Escalation:** In emergency or ad-hoc scenarios (e.g. an IT vendor or contractor already on premise urgently needing access to a data center, server room, or electrical closet not included in their initial access level), security operators must either cancel and re-create the visit or permanently alter the shared access level template, risking privilege creep and audit gaps.
3. **Imprecise In-Facility Location Tracking on Single-Direction Doors:** Many physical rooms only feature external biometric/QR scanners (In-Readers) and use mechanical push-to-exit buttons or motion sensors for exit, generating no identity-linked outbound tap. Without directionality awareness and implicit room transition tracking, the monitoring dashboard cannot distinguish whether a visitor is still in a previously entered room or has moved to another facility wing.

## Solution

Provide an integrated enhancement suite addressing physical hardware edge-cases:

1. **Touchless Fast-Track Auto Check-In on First Tap:** When an approved visitor presents their biometric face or QR code at an authorized exterior perimeter turnstile or facility entrance during their scheduled visit window, the system automatically transitions the visit from `APPROVED` to `CHECKED_IN`, activates live attendance tracking, records the initial entry event, and notifies the internal host without receptionist intervention.
2. **Time-Bounded Emergency Access Escalation:** Enable authorized security officers and hosts to grant immediate, temporary access to additional doors for an active visit directly from the live monitoring view. Each escalation includes a mandatory business justification, explicit expiration duration (e.g. 1 to 4 hours), instant synchronization to HikCentral hardware controllers, an immutable audit log, and automated revocation upon expiration or visit check-out.
3. **Door Directionality Metadata & Implicit Presence Transitions:** Model facility doors with explicit access topology (`DUAL_DIRECTION` vs `SINGLE_DIRECTION_IN`). When a visitor scans into Room B after entering a single-direction Room A, the system logs an implicit departure from Room A and updates their current location to Room B, while maintaining the dual-direction outer turnstile perimeter as the authoritative building boundary.

## User Stories

1. As a pre-approved visitor, I want to scan my face or QR code directly at the lobby turnstile, so that I can enter the facility without waiting in line at the reception desk.
2. As a pre-approved visitor arriving within my scheduled appointment window, I want my first turnstile tap to automatically validate and check me in, so that my host is promptly notified of my arrival.
3. As a pre-approved visitor arriving well before my permitted appointment start time, I want the turnstile to deny entry and instruct me to wait or see reception, so that unauthorized early access is prevented.
4. As an internal host, I want to receive an automated notification when my invited visitor scans through the perimeter turnstile, so that I know they have entered the premises and can prepare to receive them.
5. As a receptionist, I want visitors who have completed fast-track auto check-in to appear immediately as checked-in on my active visitor dashboard, so that I maintain accurate situational awareness of building occupancy.
6. As a receptionist, I want the option to manually check in visitors who prefer personal assistance or need physical lanyard badges, so that both automated and attended workflows coexist seamlessly.
7. As a security administrator, I want to designate specific doors as "Perimeter Entry Points" eligible for fast-track auto check-in, so that interior secure doors cannot be used to activate an unverified visit.
8. As a security officer, I want to grant an active vendor emergency access to additional doors directly from their active visit card, so that urgent maintenance work is not blocked by bureaucratic re-registration.
9. As a security officer granting emergency door access, I want to specify an explicit expiration time window, so that heightened privileges expire automatically without human forgetfulness.
10. As a security auditor, I want every emergency access grant to require a documented justification reason and operator ID, so that unauthorized privilege escalation is completely traceable.
11. As a security officer, I want emergency door access to be synchronized to HikCentral physical controllers in near real-time, so that the vendor can tap into the designated room without delay.
12. As a security officer, I want emergency door privileges to be automatically revoked the moment the visitor checks out, so that temporary rights never linger after departure.
13. As a security officer, I want the ability to manually revoke an active emergency access grant before its scheduled expiration if the emergency is resolved early, so that access is minimized immediately.
14. As an active visitor with an emergency access grant, I want door tap events on emergency doors to be accounted for under my overall visit audit log, so that all my physical movements remain transparent.
15. As a facility manager, I want each physical door in the facility directory to declare its hardware directionality (Dual-Direction reader vs Single-Direction in-reader with push-to-exit), so that the system correctly interprets raw event payloads.
16. As a security operator viewing live attendance, I want the system to recognize that a visitor entering Room B has implicitly left Room A (even if Room A only had an exit button), so that the live dashboard reflects their realistic physical location.
17. As a security operator viewing live attendance, I want to see both the visitor's current location and their previous transition history, so that their path through the building is clear at a glance.
18. As a facility security manager, I want the outer turnstiles to remain the canonical determinant of whether a visitor is inside or outside the building, so that missing room-exit taps never falsely mark a visitor as having left the facility.
19. As an operations supervisor, I want to configure an inactivity timeout for single-direction rooms, so that visitors are not indefinitely displayed as inside a meeting room after the meeting has concluded.
20. As a developer integrating third-party webhooks, I want the door tap ingestion endpoint to gracefully handle both auto check-in transitions and normal tap increments idempotently, so that duplicate network events do not corrupt visit state.

## Implementation Decisions

### 1. Auto Check-In on First Tap Pipeline
- The existing door tap HTTP endpoint will be enhanced to accept tap events for visits in `APPROVED` status if and only if the tap occurs on a designated perimeter entrance door within the scheduled visit window (plus a configurable early arrival buffer, defaulting to 15 minutes).
- When an eligible `APPROVED` visit is tapped, the domain service will atomically transition the visit status to `CHECKED_IN`, record `checkInTimeUtc`, dispatch a registerment confirmation to HikCentral if required, initialize the tap counter at 1, and record the `DoorTapEvent`.
- If the visitor taps before the permitted window or at an internal door before perimeter entry, the tap is rejected with an explicit validation error and access denied outcome.

### 2. Time-Bounded Emergency Access Escalation Model
- Add an `EmergencyAccessGrant` structure to the active visit domain entity:
  - `id`: Unique grant identifier (UUID)
  - `visitId`: Parent visit identifier
  - `doorIndexCodes`: Array of physical door codes granted
  - `doorNames`: Array of user-friendly door names
  - `grantedByUserId`: ID of the authorizing operator
  - `grantedByName`: Name of authorizing operator
  - `reason`: Mandatory text justification
  - `grantedAtUtc`: ISO 8601 UTC timestamp
  - `expiresAtUtc`: ISO 8601 UTC timestamp
  - `status`: Lifecycle state (`ACTIVE`, `EXPIRED`, `REVOKED`)
- Provide dedicated service methods and HTTP endpoints to grant, inspect, and revoke emergency access.
- When an emergency grant is created or revoked, the HikCentral adapter will invoke the upstream privilege group update endpoint to synchronize physical access controllers immediately.
- The active monitoring service will check for active grants when verifying tap permissions and automatically mark expired grants upon schedule elapse or visit check-out.

### 3. Door Directionality & Implicit Room Transition Engine
- Enhance the facility door domain schema with:
  - `accessType`: `"DUAL_DIRECTION" | "SINGLE_DIRECTION_IN"`
  - `isPerimeter`: Boolean indicating whether the door acts as an outer facility boundary
  - `roomTimeoutMinutes`: Optional duration after which single-direction room presence transitions to an indeterminate corridor/zone state.
- In the active monitoring service, when recording a door tap:
  - If a visitor currently has `lastSeenDoor` set to Door A (which is single-direction), and scans into Door B (a different room), the service records an implicit exit log from Door A, sets `lastSeenDoor` to Door B, and appends a transition breadcrumb.
  - If a visitor scans an exit reader on a perimeter door, the visit transitions to checkout evaluation (or decrements quota).

### 4. Isomorphic Contracts & Clean Seams
- Update isomorphic contract definitions (`*-contract.ts`) with input validators, runtime type guards, and serializable schemas.
- Expose pure helper functions for evaluating auto-checkin eligibility and active emergency grant validity, enabling thorough unit testing without external dependencies.
- Retain the strict Anti-Corruption Layer: all upstream HikCentral parameters remain isolated within adapter boundaries.

## Testing Decisions

- **Test Philosophy:** Verify observable behavior at the highest possible seams (HTTP route handlers and domain service interfaces) using deterministic in-memory fixtures. Never mock internal private methods or assert against volatile DOM structures.
- **Auto Check-In Tests:**
  - Verify an approved visit transitions to `CHECKED_IN` on first perimeter tap within valid time window.
  - Verify rejection when tapping prior to allowed arrival window.
  - Verify rejection when tapping an internal room door while still in `APPROVED` status.
  - Verify idempotency against duplicate webhook tap deliveries.
- **Emergency Access Tests:**
  - Verify granting emergency access updates visit active doors, records audit log, and invokes hardware adapter.
  - Verify rejection when required justification or valid expiry is omitted.
  - Verify taps on emergency doors succeed while grant is `ACTIVE`.
  - Verify taps on emergency doors fail after expiry timestamp or manual revocation.
  - Verify check-out immediately revokes all active emergency grants.
- **Door Topology & Transition Tests:**
  - Verify single-direction vs dual-direction metadata parsing and defaults.
  - Verify implicit exit recording when transitioning from Single-Direction Room A to Room B.
  - Verify perimeter exit reader triggers departure without losing intermediate room audit trails.
- **Prior Art:** Existing service tests (`src/lib/vms/active-monitoring-service.test.ts`, `src/lib/vms/access-level-service.test.ts`, `src/app/api/vms/active-visits/[visitId]/tap/route.test.ts`).

## Out of Scope

- Physical wiring or low-level firmware flashing of Hikvision MinMoe terminals or controller relays.
- Real-time video stream overlay (RTSP / WebRTC video canvas) inside the door tap modal.
- Multi-party digital signature ceremony for emergency access (single operator authorization with mandatory audit justification is sufficient for this phase).
- GPS / Bluetooth Low Energy (BLE) indoor micro-location beacon triangulation.

## Further Notes

- The implementation will adhere strictly to existing architectural decisions: ADR 0001 (Hybrid State & HikCentral Execution Engine), ADR 0002 (Facility Timezone & UTC Storage), and ADR 0004 (Biometric Retention).
- All changes must pass `pnpm check` (100% test pass rate, 0 lint errors, 0 type errors) and maintain Turbopack production build compatibility.

