# 05: Dynamic Access Level Management (Door/Floor Bundling & Tap Quota)

**What to build:** A dynamic access level management interface for Security Administrators. Administrators can view physical doors and time schedules fetched from HikCentral, create or edit dynamic Access Levels (`POST /artemis/api/acs/v1/privilege/group` with `type: 2`), and configure allowed zones. When scheduling or approving visits, users select one or more Access Levels and set a Tap Quota (exact entries, e.g. 1x, 2x, or unlimited `0` during visiting hours). The quota is mapped to HikCentral's `accessInfo.qrCodeValidNum` for QR credentials and persisted in the local database for face tap monitoring.

**Blocked by:** 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet

**Status:** resolved

- [x] HikCentral adapter integration for visitor access levels (`acs/v1/privilege/group` `type=2`, `acs/v1/privilege/group/{add,update,delete}`).
- [x] Security Admin UI for managing dynamic Access Levels (bundling doors, elevator floors, and time schedule templates).
- [x] Visit scheduling integration allowing selection of multiple Access Levels and configuration of Tap Quota.
- [x] Credential mapping encoding `qrCodeValidNum` (0–1000) into QR code generation requests and local quota tables.
- [x] Tests covering access level CRUD operations, privilege group synchronization to HikCentral, and quota limit validation.

## Comments
- Implemented isomorphic contracts in `src/lib/vms/access-level-contract.ts` with time schedule templates (All-Day, Workday, Holiday) and pure validators.
- Extended `vms-contract.ts` with `accessLevelIds` and `tapQuota` configuration.
- Extended `IVmsRepository` and `InMemoryVmsRepository` with Access Level CRUD operations and default pre-seeded access levels per facility.
- Implemented HikCentral Access Level Adapter `src/lib/vms/hikcentral-access-level-adapter.ts` covering list, add, update, and delete endpoints with live and stub modes.
- Wired `accessLevelList` and `qrCodeValidNum` mapping into `hikcentral-appointment-adapter.ts` for appointment reservation payloads.
- Implemented Access Level Domain Service `src/lib/vms/access-level-service.ts`.
- Implemented Route Handlers: `GET/POST /api/vms/access-levels` and `GET/PUT/DELETE /api/vms/access-levels/[id]`.
- Built Security Admin UI at `/vms/access-levels` with door/floor preset chips, schedule templates, and default badge controls.
- Integrated Access Levels selection and Tap Quota configuration into Host Pre-Registration form and Result card.
- Added Dynamic Access Levels navigation card on Home page (`/`).
- Verified with 251 passing tests across 30 test files and zero lint/typecheck/build errors.

