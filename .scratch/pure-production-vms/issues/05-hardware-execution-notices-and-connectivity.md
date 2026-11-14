# 05: Global HikCentral Connectivity Health & Hardware Execution Notices

**What to build:** Build the `HikCentralStatusBadge` component in `src/components/vms/header.tsx` pinging the gateway version endpoint to provide real-time connection status (Online / Offline / Configuration Missing) and a manual recheck trigger. Add confirmation dialogs for dangerous physical actions (Emergency door open/lock, forced check-out) that warn operators of direct hardware impact, and display live hardware receipts (`appointRecordId`, ticket code, controller status) on successful dispatches. Disable physical hardware action buttons when the gateway is offline.

**Blocked by:** 03, 04

**Status:** done

- [x] Create `src/components/vms/hikcentral-status-badge.tsx` and integrate it into `src/components/vms/header.tsx`.
- [x] Implement confirmation modals for:
  - Emergency door control (`POST /artemis/api/acs/v1/door/doControl`).
  - Forced check-out (`POST /artemis/api/visitor/v1/checkOut`).
- [x] Add hardware execution notice toasts/banners displaying official machine proof upon successful operations (e.g. `appointRecordId`, ticket code, sync timestamp).
- [x] Disable physical action buttons with explanatory warning tooltips/banners when HikCentral connection is offline.
- [x] Write component tests verifying connection badge states, confirmation prompts, and hardware receipts.

## Comments
- Implemented real-time `HikCentralStatusBadge` pinging `/api/hikcentral/version` with latency and manual retest trigger.
- Integrated into `src/components/vms/header.tsx` with full dark mode support.
- Added explicit physical hardware impact confirmation screen in `EmergencyAccessModal`.
- Added hardware execution receipt formatting with ticket codes and machine timestamps.
- Unit and component tests pass.

