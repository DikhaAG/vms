# 04: Pre-Registration & HikCentral Artemis Timezone Alignment

**What to build:** Host employees schedule upcoming visitor appointments without having to choose a facility from a dropdown. The pre-registration service assigns building access levels and pushes scheduled appointment credentials to HikCentral Artemis (`POST /artemis/api/visitor/v2/appointment`) using ISO 8601 timestamps formatted with the local timezone offset derived from the global system settings.

**Blocked by:** 01: Expand Phase — System Settings Schema, Repository Contracts & Non-Breaking Types, 03: Flat Access Levels & Door Permission Assignment

**Status:** resolved

- [x] Host visitor pre-registration form (`/vms/pre-registration`) schedules visits without displaying a facility dropdown.
- [x] Pre-registration API endpoint (`POST /api/vms/pre-registration`) validates and persists visits without requiring `facilityId`.
- [x] Appointment synchronization with HikCentral Artemis (`POST /artemis/api/visitor/v2/appointment`) automatically formats UTC appointment timestamps into ISO 8601 strings with local timezone offset derived from global `systemSettings.timezone`.
- [x] Pre-registration confirmation displays the scheduled appointment in local time according to the global system timezone.
- [x] Integration tests verify pre-registration persistence, access level assignment, and proper HikCentral ISO 8601 offset calculation.
