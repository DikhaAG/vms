---
status: accepted
---

# Multi-Facility SaaS Architecture with Dynamic Expansion

We will design the VMS database schema, domain models, and API contracts with a multi-facility SaaS architecture from day one (every Visit, Access Level, and Terminal binding is scoped by a `facilityId` with its own IANA timezone and HikCentral gateway configuration), allowing clients to start with a single building and dynamically expand to multiple branches/locations without architectural refactoring.

## Considered Options

- **Single-Building Hardcoded Model**: Assume all visits and terminals belong to one implicit building and timezone, deferring multi-site schema changes to a future version.
- **Multi-Facility SaaS Model from Day One**: Model `Facility` as a first-class entity with dynamic onboarding, individual IANA timezones, and scoped access points.

## Consequences

- The application supports both single-building pilots and enterprise multi-branch expansions out-of-the-box.
- All database queries, visit lists, access levels, and HikCentral terminal synchronization routines must explicitly resolve the active `facilityId`.

