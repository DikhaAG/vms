# 06: Front-Desk Receptionist Walk-in & Fast Check-in

**What to build:** A dedicated front-desk dashboard for Receptionists. Receptionists can perform fast visitor lookup by name, identity number (`certificateNo`), or QR code scan, verify the visitor's identity and face photo, and execute one-click Check-in via `POST /artemis/api/visitor/v1/registerment`. For unscheduled visitors arriving at the lobby, the Receptionist can perform an immediate Walk-in registration (assigning an available Host and Access Level). The visit transitions to `CHECKED_IN`, hardware credential distribution is triggered across access controllers, and live terminal synchronization status is displayed.

**Blocked by:**
- 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet
- 02: Biometric Face Photo Capture, Normalization & Quality Verification
- 05: Dynamic Access Level Management (Door/Floor Bundling & Tap Quota)

**Status:** resolved

- [x] Front-desk lookup engine supporting search by name, phone, identity number, and QR code token.
- [x] Check-in adapter invoking `POST /artemis/api/visitor/v1/registerment` and updating local visit status to `CHECKED_IN`.
- [x] Walk-in registration form for front-desk staff with Host selector, Access Level picker, photo capture, and instant check-in.
- [x] Hardware sync trigger and real-time element download detail monitoring (`visitor/v1/person/ID/elementDownloadDetail`).
- [x] Receptionist UI with queue view, visitor verification modal, and one-click check-in button.
- [x] Tests covering walk-in creation, pre-registered check-in, check-in updates, and terminal sync verification.

## Comments

- Implemented isomorphic check-in contract (`checkin-contract.ts`) with validators for check-in input, walk-in registration, and search query.
- Extended `IVmsRepository` and `InMemoryVmsRepository` with `searchVisits`, `checkInVisit`, and check-in audit event logging.
- Created `hikcentral-checkin-adapter.ts` with typed `POST /artemis/api/visitor/v1/registerment` execution, wire translation, and stub/live support.
- Built `checkin-service.ts` domain service orchestrating fast visitor lookup, pre-registered check-in with `appointRecordId` renewal, and instant walk-in registration.
- Added API endpoints `GET /api/vms/check-in/search`, `POST /api/vms/check-in/[visitId]`, and `POST /api/vms/check-in/walk-in`.
- Developed Front-Desk Receptionist UI (`/vms/reception`) with arrival queue, visitor verification modal with photo inspection, walk-in guest registration form with webcam photo capture, and digital QR/PIN visitor pass modal with live terminal sync retry.
- Added `/vms/reception` navigation card to home page (`src/app/page.tsx`).
- Verified all 36 test files and 287 unit/integration tests pass, `pnpm check` and `pnpm build` pass with 0 errors.
