---
status: accepted
---

# Pure Production VMS with Local PostgreSQL and HikCentral-Authoritative Doors

We will eliminate all simulation stubs and pre-seeded dummy data from the `/vms` application, establish a dedicated local PostgreSQL database for persistence, source physical door topology authoritatively from HikCentral (`acsDoorList`), and mandate explicit hardware execution notices across all physical actions.

## Considered Options

- **Retain In-Memory Repository with Stub Toggles in UI**: Keeping mock dropdowns and `InMemoryVmsRepository` for ease of dev, allowing operators to switch between live and stub modes directly in production screens.
- **File-Backed JSON Store with Manual Door Inputs**: Persisting state in local JSON files while letting administrators manually type door names and index codes in VMS.
- **Pure Production VMS + Local PostgreSQL + HikCentral-Authoritative Doors**:
  1. Stripping all stub/simulation selectors from `/vms` so every user interaction is strictly live production.
  2. Adopting a dedicated local PostgreSQL database for reliable, relational persistence of visits, audit trails, and synchronized master records.
  3. Sourcing doors strictly from HikCentral OpenAPI (`POST /artemis/api/resource/v1/acsDoor/acsDoorList`) and removing manual door creation in VMS.
  4. Implementing informative empty states when no real visits or doors exist yet.
  5. Enforcing explicit hardware execution notices (confirmation dialogs for critical actions and live hardware transaction receipts on success).

## Consequences

- **Physical Integrity**: Door topology in VMS is guaranteed to mirror physical access controllers in the building. Operators cannot accidentally assign non-existent doors or invalid `doorIndexCode` values.
- **Production Truth**: Staf and security operators work exclusively with genuine records. No dummy visits or test cards will be mistaken for real visitors.
- **Persistent Audit Trail**: Visit histories, biometric face encryption references, tap counts, and overstay violations survive server restarts and process recycling in PostgreSQL.
- **Operational Safety**: Dangerous operations (such as emergency door unlocking or forced check-outs) require explicit operator confirmation, and every successful dispatch displays the official HikCentral transaction identifiers (`appointRecordId`, ticket code, controller status).
- **Setup Prerequisite**: Running the VMS now requires a live PostgreSQL instance configured via `DATABASE_URL` and valid HikCentral OpenAPI credentials in `.env.local`.

