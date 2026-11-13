# 05: Dynamic Access Level Management (Door/Floor Bundling & Tap Quota)

**What to build:** A dynamic access level management interface for Security Administrators. Administrators can view physical doors and time schedules fetched from HikCentral, create or edit dynamic Access Levels (`POST /artemis/api/acs/v1/privilege/group` with `type: 2`), and configure allowed zones. When scheduling or approving visits, users select one or more Access Levels and set a Tap Quota (exact entries, e.g. 1x, 2x, or unlimited `0` during visiting hours). The quota is mapped to HikCentral's `accessInfo.qrCodeValidNum` for QR credentials and persisted in the local database for face tap monitoring.

**Blocked by:** 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet

**Status:** ready-for-agent

- [ ] HikCentral adapter integration for visitor access levels (`acs/v1/privilege/group` `type=2`, `acs/v1/privilege/group/{add,update,delete}`).
- [ ] Security Admin UI for managing dynamic Access Levels (bundling doors, elevator floors, and time schedule templates).
- [ ] Visit scheduling integration allowing selection of multiple Access Levels and configuration of Tap Quota.
- [ ] Credential mapping encoding `qrCodeValidNum` (0–1000) into QR code generation requests and local quota tables.
- [ ] Tests covering access level CRUD operations, privilege group synchronization to HikCentral, and quota limit validation.

## Comments

