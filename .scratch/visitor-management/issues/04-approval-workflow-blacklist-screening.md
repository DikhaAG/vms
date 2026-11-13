# 04: Approval Workflow & Monitoring List (Blacklist) Screening

**What to build:** An automated screening and approval gate for scheduled visits. When a visit is created or submitted, the system checks the visitor's `certificateNo` against HikCentral's Monitoring List (`watchListInfo`). If flagged, the visit is locked and escalated to Security. For normal visits, an Approver (Host manager or Security Officer) accesses a pending approval queue, inspects the visitor photo, host, and visiting details, and approves or rejects the request with comments. Approving the visit advances status from `PENDING_APPROVAL` to `APPROVED`, arms terminal credentials, and emits approval audit records.

**Blocked by:** 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet

**Status:** resolved

- [x] Monitoring list screening integration via `POST /artemis/api/visitor/v2/appointment` response matching and blacklist query endpoints.
- [x] Security escalation state and review queue for flagged identity numbers.
- [x] Approver dashboard listing pending visits with visitor details, host information, photo preview, and decision actions.
- [x] State transition engine enforcing `PENDING_APPROVAL -> APPROVED | REJECTED` with required rejection comments.
- [x] Credential arming trigger upon approval, updating HikCentral approval state when configured.
- [x] Tests covering approval state machine, unauthorized transitions, monitoring list intercept, and audit trail logging.

## Comments

- Implemented isomorphic `approval-contract.ts` with runtime guards, `ApprovalAction`, `ApprovalRecord`, `MonitoringListFlag`, and pure input validator `validateApprovalDecision`.
- Updated `VisitStatus` in `vms-contract.ts` to include `SECURITY_ESCALATED`.
- Implemented `hikcentral-approval-adapter.ts` with `parseMonitoringListFlag` (anti-corruption translation for `identiFiyCode` -> `certificateNo`) and `syncApprovalToHikCentral` (`POST /artemis/api/visitor/v1/visitorapprovalflow/status`).
- Wired monitoring list interception into `pre-registration-service.ts` and `self-registration-service.ts` to automatically flag and escalate visits with matching identity credentials.
- Implemented `IVmsRepository` methods for `getVisitsByStatus`, `saveApprovalRecord`, `listApprovalRecords`, and atomic `updateVisitStatusWithApproval`.
- Implemented `approval-service.ts` with `listPendingApprovals` and `decideApproval` enforcing state transitions, mandatory rejection reasons, and credential arming.
- Implemented API route handlers `GET /api/vms/approvals` and `POST /api/vms/approvals/[visitId]`.
- Implemented responsive Approver UI at `/vms/approvals` with tabs for Pending Approvals vs Security Escalated / Blacklist Review, persona switching, visit card inspections, and rejection modals.
- Comprehensive unit and integration test coverage across 25 test files (202 tests) passing with 0 errors.
