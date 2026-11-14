# 04: Zero-Data Default & Informative Empty States

**What to build:** Purge pre-seeded mock visits (`DEFAULT_VISITS`), mock visitor profiles (`DEFAULT_VISITOR_PROFILES`), and hardcoded dummy doors from the initial runtime state. Implement clean, informative Indonesian Empty States across all feature pages (`/vms/reception`, `/vms/active-monitoring`, `/vms/approvals`, `/vms/access-levels`, `/vms/visitors`) guiding the operator on what actions to take when no data exists yet.

**Blocked by:** 01

**Status:** done

- [x] In `src/lib/vms/repository.ts` and `src/lib/vms/postgres-repository.ts`:
  - Ensure initial visit, profile, and door tables/maps start completely empty unless real data is seeded by the operator or synchronized from HikCentral.
- [x] Implement friendly Empty State components in:
  - `src/app/vms/reception/reception-client.tsx` (Empty scheduled and checked-in tabs).
  - `src/app/vms/active-monitoring/active-monitoring-client.tsx` (Empty active visits list).
  - `src/app/vms/approvals/approvals-client.tsx` (Empty approval queue).
  - `src/app/vms/access-levels/access-levels-client.tsx` (Empty doors / access levels warning with sync button).
  - `src/app/vms/visitors/visitors-client.tsx` (Empty visitor directory).
- [x] Update and add tests to verify proper rendering of zero-data empty states.

## Comments
- Initial visitor profiles purged from production default (`DEFAULT_VISITOR_PROFILES = []`), preserving fixture in `TEST_FIXTURE_VISITOR_PROFILES`.
- Initial visits and database starts clean with 0 records.
- Verified polite, helpful empty state displays across all 5 key VMS sections.
- Unit and UI component tests passing.

