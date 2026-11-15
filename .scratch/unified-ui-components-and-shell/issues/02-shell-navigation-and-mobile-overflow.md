# 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**What to build:** An ergonomic desktop sidebar collapse toggle positioned in a dedicated bottom footer dock, leaving the brand header uncluttered and perfectly centered in collapsed mode; and a mobile-optimized top navigation bar that eliminates horizontal overflow on viewports under 640px by cleanly managing breadcrumbs, facility selection, and live telemetry.

**Blocked by:** 01: Canonical Reusable UI Component Primitives

**Status:** resolved

- [x] Desktop sidebar collapse toggle moved from top header to bottom footer dock in `Sidebar`.
- [x] Brand logo mark remains centered and visually calm when sidebar is in collapsed icon rail mode (`w-18`).
- [x] Expanded sidebar displays full-width bottom toggle button with icon and accessible text ("Ciutkan Menu").
- [x] Top navigation bar header wrapped with strict overflow constraints (`max-w-full overflow-hidden`).
- [x] Live second-counter clock and timezone badge hidden on screens narrower than 640px, but prominently displayed inside the mobile navigation drawer.
- [x] Breadcrumbs on narrow mobile screens truncated to the active page title, preventing collisions with hamburger and profile buttons.
- [x] Header components fit within 360px–390px viewports with zero horizontal scrolling.
- [x] Unit and integration tests in `sidebar.test.tsx`, `header.test.tsx`, and `app-shell.test.tsx` pass without regressions.

## Answer

Implemented ergonomic bottom dock sidebar toggle and mobile overflow protection in commit `56483d4` (merged into `feat/unified-ui-components-and-shell`):

- **Sidebar Bottom Dock (`src/components/vms/sidebar.tsx`):**
  - Moved desktop sidebar toggle from top header to dedicated bottom footer dock (`sidebar-collapse-toggle`).
  - Centered brand logo mark in collapsed rail mode (`w-18`), free from adjacent toggle button crowding.
  - Rendered full-width bottom toggle button with icon and "Ciutkan Menu" text in expanded mode, collapsing to centered icon button in rail mode.
  - Added telemetry block to mobile drawer displaying facility selector and live timezone clock.
- **Responsive Top Header (`src/components/vms/header.tsx`):**
  - Wrapped header with strict overflow constraints (`max-w-full overflow-hidden`).
  - Truncated breadcrumbs on narrow viewports (`< 640px`) to active page title only.
  - Hid live second-counter clock and timezone badge on viewports `< 640px` (available in mobile drawer).
  - Constrained facility selector width with responsive truncation (`max-w-[120px] sm:max-w-[180px]`) to prevent layout breaking or horizontal scrolling on 360px–390px viewports.
- **Verification:**
  - `src/components/vms/sidebar.test.tsx`: 9 unit tests verifying bottom dock toggle rendering, state toggles, and tooltips.
  - `src/components/vms/header.test.tsx`: 13 unit tests verifying responsive truncation, clock visibility classes, and overflow containment.
  - `src/components/vms/app-shell.test.tsx`: 2 unit tests verifying shell layout and drawer telemetry integration.
  - Total 48/48 tests passed across the shell suite.
  - `pnpm test`, `pnpm typecheck`, and `pnpm lint` passed with 0 errors.
