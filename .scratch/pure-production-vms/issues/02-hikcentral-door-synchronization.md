# 02: HikCentral Door Synchronization Adapter (`acsDoorList`) & Sync API

**What to build:** Build the HikCentral OpenAPI adapter for physical door discovery using `POST /artemis/api/resource/v1/acsDoor/acsDoorList`. Extract controller channels, door names, and hardware `doorIndexCode` identifiers. Deduce perimeter boundaries (speedgates, turnstiles) vs interior doors. Implement Next.js route handler `POST /api/vms/sync/doors` that triggers door synchronization, persists the results to `IVmsRepository.saveDoors()`, and returns detailed sync metrics.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Create `src/lib/vms/hikcentral-door-adapter.ts` with typed inputs/outputs and `syncHikCentralDoors()` function.
- [ ] Implement live HikCentral Artemis client call to `POST /artemis/api/resource/v1/acsDoor/acsDoorList`.
- [ ] Map raw HikCentral doors to domain `FacilityDoor` structures with accurate `doorIndexCode`, `facilityId`, and `accessType`.
- [ ] Create route handler `POST /api/vms/sync/doors` in `src/app/api/vms/sync/doors/route.ts` with error handling and transaction counts.
- [ ] Write unit tests in `src/lib/vms/hikcentral-door-adapter.test.ts` and `src/app/api/vms/sync/doors/route.test.ts`.

## Comments

