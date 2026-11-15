# 02: Responsive Shell & Ergonomic Bottom Dock Sidebar Toggle

**What to build:** An ergonomic desktop sidebar collapse toggle positioned in a dedicated bottom footer dock, leaving the brand header uncluttered and perfectly centered in collapsed mode; and a mobile-optimized top navigation bar that eliminates horizontal overflow on viewports under 640px by cleanly managing breadcrumbs, facility selection, and live telemetry.

**Blocked by:** 01: Canonical Reusable UI Component Primitives

**Status:** ready-for-agent

- [ ] Desktop sidebar collapse toggle moved from top header to bottom footer dock in `Sidebar`.
- [ ] Brand logo mark remains centered and visually calm when sidebar is in collapsed icon rail mode (`w-18`).
- [ ] Expanded sidebar displays full-width bottom toggle button with icon and accessible text ("Ciutkan Menu").
- [ ] Top navigation bar header wrapped with strict overflow constraints (`max-w-full overflow-hidden`).
- [ ] Live second-counter clock and timezone badge hidden on screens narrower than 640px, but prominently displayed inside the mobile navigation drawer.
- [ ] Breadcrumbs on narrow mobile screens truncated to the active page title, preventing collisions with hamburger and profile buttons.
- [ ] Header components fit within 360px–390px viewports with zero horizontal scrolling.
- [ ] Unit and integration tests in `sidebar.test.tsx`, `header.test.tsx`, and `app-shell.test.tsx` pass without regressions.

