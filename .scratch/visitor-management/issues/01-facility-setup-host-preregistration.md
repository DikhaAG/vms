# 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet

**What to build:** An internal Host or Administrator can configure or select a Facility (with its local IANA timezone, e.g. `Asia/Jakarta`), input visitor details (first/last name, phone/email, identity `certificateNo`, scheduled start/end times in facility local time, and visit reason), and submit a Pre-registration. The system normalizes timestamps to UTC for database persistence, converts them to the facility's local ISO 8601 offset format (`yyyy-MM-ddTHH:mm:ss+HH:mm`) for HikCentral OpenAPI, dispatches `POST /artemis/api/visitor/v2/appointment` (with live and stub support), persists the created Visit and HikCentral's returned `visitorId` and `appointRecordId`, and renders the created visit card with an initial QR code pass preview in the UI.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Domain models and database schema for `Facility` (with IANA timezone) and `Visit` (with status `PENDING_APPROVAL`, UTC visit window, and HikCentral references).
- [x] Timezone conversion utility translating UTC to facility-specific ISO 8601 offset strings up to 64 chars.
- [x] HikCentral adapter integration for `POST /artemis/api/visitor/v2/appointment` handling `userId`, `appointStartTime`, `appointEndTime`, `visitorInfoList`, and optional `receptionistId`.
- [x] Pre-registration UI with facility selector, visitor information fields, date/time pickers with local timezone labeling, and submit action.
- [x] Display card showing the created Visit details, status badge, and QR code pass preview.
- [x] End-to-end tests verifying scheduling, timezone translation, HikCentral payload generation, and error mapping without leaking secrets.

## Comments

- Implemented isomorphic domain contracts (`src/lib/vms/vms-contract.ts`), timezone utilities (`src/lib/vms/timezone.ts`), in-memory repository with pre-seeded multi-facility support across Jakarta, Bali, and Jayapura (`src/lib/vms/repository.ts`), HikCentral appointment adapter with live & stub modes (`src/lib/vms/hikcentral-appointment-adapter.ts`), and pre-registration orchestration service (`src/lib/vms/pre-registration-service.ts`).
- Added Route Handlers (`/api/vms/facilities` and `/api/vms/pre-registration`).
- Created responsive Pre-Registration UI at `/vms/pre-registration` with dynamic timezone labeling, visitor form, execution simulator, result card, and digital QR pass preview.
- Added comprehensive unit and E2E tracer bullet tests (`src/test/e2e-tracer-bullet.test.ts`), with 100% pass rate (69 tests).

