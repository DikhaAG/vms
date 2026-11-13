# 04: Approval Workflow & Monitoring List (Blacklist) Screening

**What to build:** An automated screening and approval gate for scheduled visits. When a visit is created or submitted, the system checks the visitor's `certificateNo` against HikCentral's Monitoring List (`watchListInfo`). If flagged, the visit is locked and escalated to Security. For normal visits, an Approver (Host manager or Security Officer) accesses a pending approval queue, inspects the visitor photo, host, and visiting details, and approves or rejects the request with comments. Approving the visit advances status from `PENDING_APPROVAL` to `APPROVED`, arms terminal credentials, and emits approval audit records.

**Blocked by:** 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet

**Status:** ready-for-agent

- [ ] Monitoring list screening integration via `POST /artemis/api/visitor/v2/appointment` response matching and blacklist query endpoints.
- [ ] Security escalation state and review queue for flagged identity numbers.
- [ ] Approver dashboard listing pending visits with visitor details, host information, photo preview, and decision actions.
- [ ] State transition engine enforcing `PENDING_APPROVAL -> APPROVED | REJECTED` with required rejection comments.
- [ ] Credential arming trigger upon approval, updating HikCentral approval state when configured.
- [ ] Tests covering approval state machine, unauthorized transitions, monitoring list intercept, and audit trail logging.

## Comments

