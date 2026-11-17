# 05: Correct visitor profile and Host notification behaviour

**What to build:** A Receptionist sees how many Visits each visitor profile has and can search profiles by email as well as name, identity number and phone. Saving a profile whose identity number already belongs to another profile replaces that profile instead of creating a duplicate, so one Visitor has one profile. Host arrival notifications are listed newest first.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Listing visitor profiles fills each profile's Visit count (Visits with the same identity number)
- [ ] Visitor profile search matches email
- [ ] Saving a profile with an existing identity number under a different id removes the older profile
- [ ] Host arrival notifications are returned newest first
- [ ] Verified manually against a real PostgreSQL database
- [ ] Type-check, lint and `vitest run` pass
