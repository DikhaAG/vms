# 05: Reception Desk & Walk-In Intake

**What to build:** Receptionists process arriving visitors and register walk-in guests directly at the front desk without filtering or selecting a facility. Visitor lookups search the entire building schedule, badges print with site-wide access, and walk-in intakes immediately authorize credentials across the site's turnstiles and doors.

**Blocked by:** 04: Pre-Registration & HikCentral Artemis Timezone Alignment

**Status:** resolved

- [x] Reception desk dashboard (`/vms/reception`) searches and manages visitors across the entire site without requiring a facility filter in `UiFilterToolbar`.
- [x] Receptionist check-in search API (`GET /api/vms/check-in/search`) searches active and pre-registered visits globally.
- [x] Walk-in registration modal and API (`POST /api/vms/check-in/walk-in`) process arriving unscheduled visitors directly to the single site without requiring facility selection.
- [x] Check-in processing issues visitor passes and activates credentials across building doors without facility boundaries.
- [x] Tests verify search, badge printing, and walk-in check-in workflows end-to-end on the single-site reception desk.
