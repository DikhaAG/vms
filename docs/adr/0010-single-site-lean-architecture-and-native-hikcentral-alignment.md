---
status: accepted
supercedes:
  - 0002-facility-timezone-and-utc-storage.md
  - 0003-multi-facility-saas-architecture.md
---

# Single-Site Lean Architecture and Native HikCentral Alignment

We will remove the `Facility` entity and `facilityId` scoping across the entire VMS system, adopting a single-site lean deployment model with a global `system_settings` table (managing application timezone, overstay grace period, and auto check-in early buffer). Doors and access levels are managed as a flat list aligned directly with HikCentral native structures (`regionIndexCode`, `doorIndexCode`), with zero hardcoded default doors on first boot.

## Considered Options

- **Retain Multi-Facility SaaS (ADR 0002 / ADR 0003)**: Keep `Facility` as a first-class boundary entity with per-facility timezones and door partitioning.
- **Single-Site Lean Architecture with Global Settings**: Eliminate `Facility` and `facilityId`, manage global settings in a singleton database table, and align physical access points directly to native HikCentral resources without artificial multi-branch abstraction.

## Consequences

- 376 references to `facilityId` across database schemas (`facilities`, `facility_doors`, `access_levels`, `visits`), Zod contracts, and UI components are removed.
- Initial seed data for doors (`DEFAULT_DOORS`) is empty (`[]`); operators populate doors during first-time initialization or via `/api/vms/sync/doors`.
- HikCentral visitor appointment endpoints format ISO 8601 timestamps using the global timezone configured in `system_settings` (with fallback to `APP_TIMEZONE`).
- UI filters for selecting facilities (`UiFilterToolbar`) are eliminated, streamlining receptionist and monitoring screens.
