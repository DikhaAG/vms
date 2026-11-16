# 04: Emergency Access Grants never stored inside the Visit row

**What to build:** A Visit's Emergency Access Grants always come from the grants table. Saving or updating a Visit no longer writes the grants list into the Visit row, so an expired or revoked grant can never reappear on a Visit. Reading a Visit still attaches its active, unexpired grants.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Saving or updating a Visit stores no Emergency Access Grants in the Visit row
- [ ] Reading a Visit (single and active list) attaches only ACTIVE, unexpired grants from the grants table
- [ ] After a grant is revoked or expires, the Visit shows no grants on the next read, including Visits whose rows still hold an old copy
- [ ] Verified manually against a real PostgreSQL database
- [ ] Type-check, lint and `vitest run` pass
