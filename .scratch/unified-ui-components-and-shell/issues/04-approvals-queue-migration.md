# 04: Approvals Queue Migration to Active-Monitoring Architecture

**What to build:** Refactoring of the Approvals Queue page (`/vms/approvals`) to eliminate legacy Tailwind classes (`bg-white`, `border-neutral-200`, `bg-neutral-900`) and adopt `PageHeader`, `UiFilterToolbar`, `UiCard`, `UiBadge`, `UiButton`, and `UiModal`.

**Blocked by:** 01: Canonical Reusable UI Component Primitives, 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**Status:** ready-for-agent

- [ ] `src/app/vms/approvals/page.tsx` updated to use `PageHeader`.
- [ ] Facility and approver persona controls refactored to use `UiFilterToolbar`.
- [ ] Normal and escalated queue tabs refactored with uniform typography and badge counters.
- [ ] Approval visit cards and escalation items refactored with `UiCard`, `UiBadge`, and tactile `UiButton` actions (Setujui, Tolak, Eskalasi).
- [ ] Rejection modal refactored to use `UiModal`.
- [ ] All dual-class dark/light legacy styles removed in favor of Kinpaku design tokens.
- [ ] `src/app/vms/approvals/approvals-client.test.tsx` passes with 100% success rate.

