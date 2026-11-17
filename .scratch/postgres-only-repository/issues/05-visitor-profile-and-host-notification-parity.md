# 05: Correct visitor profile and Host notification behaviour

**What to build:** A Receptionist sees how many Visits each visitor profile has and can search profiles by email as well as name, identity number and phone. Saving a profile whose identity number already belongs to another profile replaces that profile instead of creating a duplicate, so one Visitor has one profile. Host arrival notifications are listed newest first.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Listing visitor profiles fills each profile's Visit count (Visits with the same identity number)
- [x] Visitor profile search matches email
- [x] Saving a profile with an existing identity number under a different id removes the older profile
- [x] Host arrival notifications are returned newest first
- [x] Verified manually against a real PostgreSQL database
- [x] Type-check, lint and `vitest run` pass

## Comments

- Implemented on branch feat/atomic-visit-transitions. Verified manually against a throwaway PostgreSQL 18 cluster (18 scenario checks pass; 12 of them failed against the previous implementation):
  - Visit count: 3, 1 and 0 Visits for three profiles; a Visit with no identity number is not counted. Search results carry the count too.
  - Search matches email (case-insensitive), and still matches name, identity number and phone.
  - Saving a profile under a new id with an existing identity number leaves exactly one row (the new one), including when the older profile was soft-deleted. Resaving the same id keeps it. The delete and upsert run in one transaction.
  - Host notifications come back newest first, with and without a Host filter, including a `createdAtUtc` without milliseconds (which would sort wrongly as text).
  - `/vms/visitors` loads through the new listing query against the local dev database (empty, so no counts to show; not seeded).
- `visitCount` is derived, so like Emergency Access Grants (ticket 04) it is removed on every profile write and on `getVisitorProfile` / `findVisitorProfileByCertificate`. A legacy row holding a stored count no longer surfaces it.
- Notifications are sorted by parsed `Date` in JavaScript, matching the in-memory reference, rather than `ORDER BY` on the TEXT column.
- Still open (out of scope: no schema changes): `visitor_profiles.certificate_no` has no unique constraint, so two concurrent saves of the same identity number under different ids can both commit.
