# 03: Flat Access Levels & Door Permission Assignment

**What to build:** Manage building access levels and perimeter door permissions in a flat structure matching native access point topology. Administrators define named access levels and assign authorized building doors from the complete door checklist without selecting or partitioning by facility. Access levels can be assigned to visitors across the entire site.

**Blocked by:** 01: Expand Phase — System Settings Schema, Repository Contracts & Non-Breaking Types, 02: HikCentral Native Door Synchronization & Zero-Default Seed

**Status:** done

- [x] Access levels database schema and repository methods manage access levels as a flat building list without `facilityId`.
- [x] Access level API route (`/api/vms/access-levels`) and tRPC router accept and return access level payloads without facility parameters.
- [x] Access level configuration UI (`/vms/access-levels`) displays building access levels flatly and allows administrators to assign door permissions from the complete building door checklist without selecting a facility.
- [x] Initial access level seed data starts empty (`DEFAULT_ACCESS_LEVELS = []`), allowing administrators to configure clean access levels based on synced doors.
- [x] Tests verify end-to-end creation, modification, and retrieval of flat access levels and door associations.
