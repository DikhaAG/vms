# 07: Unified Approvals Queue & Group Registration

**What to build:** Approvers review and approve incoming visitor requests site-wide in a single unified queue without filtering by facility. Group organizers pre-register visiting delegations and multi-guest appointments directly to the building without choosing facility boundaries. Blacklist screening and approval evaluations execute uniformly across all visits.

**Blocked by:** 04: Pre-Registration & HikCentral Artemis Timezone Alignment

**Status:** ready-for-agent

- [ ] Approvals queue UI (`/vms/approvals`) displays all pending visit requests site-wide without facility selector filtering.
- [ ] Approval API route (`/api/vms/approvals`) and tRPC approval router process approval and rejection actions globally.
- [ ] Group registration interface (`/vms/group-registration`) and API (`POST /api/vms/group-registration`) register delegation visits without facility dropdowns.
- [ ] Blacklist screening and host approval workflows execute uniformly across all visitor requests.
- [ ] Tests verify approval decision flows and group registration workflows without facility parameters.
