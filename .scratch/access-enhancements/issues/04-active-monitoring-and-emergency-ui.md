# 04: Active Monitoring & Emergency Access UI Integration

**What to build:** Upgrade the Active Attendance Monitor user interface to display granular room-level presence, visual breadcrumbs of recent door movements (including single-direction implicit exits), badges differentiating single-direction vs dual-direction doors, and an interactive "Emergency Access" modal allowing security operators to grant, view, and manually revoke time-bounded emergency door permissions with live status indicators.

**Blocked by:** 02: Fast-Track Touchless Auto Check-In, 03: Time-Bounded Emergency Access Escalation

**Status:** completed

- [x] Active visitor cards on `/vms/active-monitoring` display the visitor's current location with door directionality badge (`Dual-Direction` or `Single-Direction In`).
- [x] Movement breadcrumb component visualizes recent transitions (e.g. `Lobby Turnstile (Entry) → Meeting Room 302 (Implicit Exit) → Server Room 01`).
- [x] Active visitor card includes a "Grant Emergency Access" action button for visits in `CHECKED_IN` or `OVERSTAY` status.
- [x] Accessible modal dialog allows operators to select additional doors, enter a mandatory justification text, and pick duration (e.g. 1h, 2h, 4h).
- [x] Active emergency grants display remaining time badge and a one-click "Revoke Access" button with confirmation prompt.
- [x] Visitors checked in via fast-track auto check-in display a `Fast-Track` badge distinguishing them from manual reception check-ins.
- [x] Form submission validates inputs on client and renders structured error banners on API failure.

