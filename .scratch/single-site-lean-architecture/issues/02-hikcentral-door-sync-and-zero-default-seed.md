# 02: HikCentral Native Door Synchronization & Zero-Default Seed

**What to build:** Synchronize physical doors directly from live HikCentral Artemis hardware without synthetic facility grouping. Fresh installations start with zero doors, eliminating hypothetical hardcoded demo sites. Operators trigger door synchronization via API or tRPC to import physical controllers and access points, preserving native HikCentral attributes (`regionIndexCode`, `doorIndexCode`, `channelNo`, and online state) into the flat door repository.

**Blocked by:** 01: Expand Phase — System Settings Schema, Repository Contracts & Non-Breaking Types

**Status:** ready-for-agent

- [ ] Initial door seed data on fresh boot starts empty (`DEFAULT_DOORS = []`), eliminating hardcoded demo doors.
- [ ] Door synchronization endpoint (`POST /api/vms/sync/doors`) and tRPC `syncDoors` procedure fetch live access points directly from HikCentral OpenAPI (`/artemis/api/resource/v1/acsDoor/acsDoorList`).
- [ ] Synchronized doors preserve native `regionIndexCode`, `doorIndexCode`, `doorName`, and online channel state in the flat door repository without assigning synthetic facility IDs.
- [ ] Synchronized doors are immediately queryable via `GET /api/vms/doors` and the `doors` tRPC router.
- [ ] Tests verify that door synchronization populates an empty repository and handles hardware offline/unreachable conditions gracefully.
