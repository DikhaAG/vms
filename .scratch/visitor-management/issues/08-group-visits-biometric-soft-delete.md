# 08: Multi-Visitor Group Visits & Returning Visitor Biometric Soft-Delete Management

**What to build:** Group visit orchestration and visitor profile lifecycle management. A Host can pre-register a Group Visit (multiple visitors attending the same meeting) in a single UI form; the backend orchestrates individual visitor calls to HikCentral under a unified `visitorGroupName`, tracking them collectively in VMS. When an existing visitor's identity number (`certificateNo`) is entered, the system suggests their profile and stored face photo for one-click re-use. Administrators can soft-delete a visitor's profile and biometrics (marking `isDeleted = true`) for privacy compliance (PDP), while preserving historical visit logs and audit trails.

**Blocked by:**
- 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet
- 02: Biometric Face Photo Capture, Normalization & Quality Verification
- 06: Front-Desk Receptionist Walk-in & Fast Check-in
- 07: Active Visit Dashboard, Door Tap Quota Enforcement, Overstay Alert & Check-out

**Status:** resolved

- [x] Group visit scheduling UI allowing addition of multiple visitors under one meeting booking.
- [x] Backend orchestration executing individual HikCentral visitor creation calls grouped by `visitorGroupName`.
- [x] Returning visitor lookup and auto-fill by `certificateNo` reusing saved profile and encrypted face photo.
- [x] Soft-delete and restore capabilities for visitor profiles, upholding privacy compliance without compromising audit integrity.
- [x] Group status overview in the visit dashboard showing attendance of all members in the group.
- [x] Tests covering group orchestration, partial failure rollback/retry, auto-fill logic, and soft-delete behavior.

## Comments

### Subagent Implementation Report (Ticket 08)
- Created isomorphic contracts & pure validators in `src/lib/vms/group-contract.ts` with test coverage in `src/lib/vms/group-contract.test.ts`.
- Extended repository interface `IVmsRepository` and in-memory implementation in `src/lib/vms/repository.ts` with visitor profile persistence, soft-delete management (`softDeleteVisitorProfile`), certificate lookup (`findVisitorProfileByCertificate`), and group queries (`listVisitsByGroup`). Tested in `src/lib/vms/repository.test.ts`.
- Implemented group orchestration domain service in `src/lib/vms/group-service.ts` with graceful partial failure handling, biometric photo normalization, returning visitor profile retention, and PDP compliance soft-delete toggling. Tested in `src/lib/vms/group-service.test.ts`.
- Implemented Next.js route handlers:
  - `POST /api/vms/group-registration`
  - `GET /api/vms/visitors/lookup`
  - `GET /api/vms/visitors`
  - `PATCH /api/vms/visitors/[id]/soft-delete`
  All covered by route integration tests.
- Built interactive UI screens:
  - `/vms/group-registration`: Multi-visitor group booking with dynamic visitor cards, returning visitor recognition banner & 1-click auto-fill, and group QR credential pass results card.
  - `/vms/visitors`: Visitor Profiles & Privacy Directory with search, PDP compliance status badges, and soft-delete (archive) & restore workflows.
  - Linked from `/` homepage.
- Enriched Active Attendance Monitor (`/vms/active-monitoring`) with group badge indicators and search-by-group capabilities.
- Verified: `pnpm check` and `pnpm build` pass with 0 errors across 48 test suites (370 tests).

