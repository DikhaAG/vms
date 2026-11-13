---
status: accepted
---

# Hybrid Application State with HikCentral Execution Engine

We will maintain a dedicated application database and role-based authentication (RBAC) layer in the Next.js VMS while treating HikCentral OpenAPI as the execution engine for visitor biometrics, access levels, credential sync, and physical door control.

## Considered Options

- **Stateless thin client over HikCentral OpenAPI**: All accounts, schedules, approvals, and state live exclusively in HikCentral; Next.js only proxies requests.
- **Hybrid local state + HikCentral execution engine**: Next.js owns enterprise RBAC, application audit logs, timezone-accurate scheduling state, and HikCentral record mappings (`visitorId`, mutable `appointRecordId`), while synchronizing executable visits, face credentials, and access levels to HikCentral.

## Consequences

- Enterprise features such as multi-role authentication (Host, Receptionist, Security Admin), accurate per-site IANA timezone conversion, advance/pending edit workflows, and extended audit trails remain under application control despite HikCentral API limits (mutable `appointRecordId` on edits, edit locks during HikCentral review, and single-visitor-per-call mutations).
- The application must keep synchronized state consistent with HikCentral (handling partial sync failures and updating stored `appointRecordId` whenever a reservation or registration is modified).

