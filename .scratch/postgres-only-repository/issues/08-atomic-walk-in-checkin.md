# 08: Atomic Walk-in check-in

**What to build:** When a Receptionist registers a Walk-in and checks the Visitor in, the new Visit and its check-in audit event are created by one repository method in one transaction. The check-in module no longer sequences the two writes itself. Every Walk-in therefore has an audit record, and a failure leaves no half-created Visit.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] A Walk-in check-in creates the Visit and its check-in audit event through a single repository method
- [ ] Both writes persist together or not at all
- [ ] The Walk-in audit event keeps today's fields (Receptionist, verification method defaulting to ID card, notes)
- [ ] Reception Walk-in flow works end to end against a real PostgreSQL database
- [ ] Type-check, lint and `vitest run` pass
