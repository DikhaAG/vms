# 01: Expand Phase — System Settings Schema, Repository Contracts & Non-Breaking Types

**What to build:** Introduce the global system settings entity and repository contracts to support single-site lean operations. Operators and system administrators configure global parameters (system timezone, overstay grace period, and auto check-in early buffer window) stored in a singleton database record. Domain contracts, repository interfaces, and search query filters expand to make legacy `facilityId` optional and introduce flat `Door` models with optional `regionIndexCode` so that existing caller workflows and the test suite remain green without breaking.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Global system settings schema (`system_settings`) is defined with singleton defaults (`timezone: "Asia/Jakarta"`, `overstayGraceMinutes: 15`, `autoCheckInEarlyBufferMinutes: 15`).
- [x] Repository interface (`IVmsRepository`), in-memory repository (`InMemoryVmsRepository`), and PostgreSQL implementation (`PostgresVmsRepository`) provide `getSettings()` and `updateSettings()` methods.
- [x] Dedicated settings API route (`GET /api/vms/settings`, `PUT /api/vms/settings`) and tRPC `settings` router expose global configuration queries and updates.
- [x] Flat door type `Door` is introduced with optional `regionIndexCode` string, aliased temporarily to `FacilityDoor` for backward compatibility.
- [x] `facilityId` is relaxed to optional across domain contracts and repository query filters so all existing call sites and existing tests continue to pass green.
- [x] Unit and integration tests verify reading and updating global settings with default fallback values.
