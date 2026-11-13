# 01: Door Topology Metadata & Implicit Room Transitions

**What to build:** Model physical door characteristics with explicit directionality metadata (`DUAL_DIRECTION` readers vs `SINGLE_DIRECTION_IN` with push-to-exit buttons) and perimeter boundaries. When a visitor scans into Room B after entering a single-direction Room A, the system automatically detects the implicit departure from Room A, records an implicit exit log, and updates their active physical presence to Room B without requiring an unattainable exit scan.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Facility door definitions support `accessType: "DUAL_DIRECTION" | "SINGLE_DIRECTION_IN"`, `isPerimeter: boolean`, and optional `roomTimeoutMinutes: number`.
- [ ] In-memory and persistent repository stores provide lookup for door topology metadata by `doorIndexCode` and `doorName`.
- [ ] Ingestion of door tap events validates door directionality and records `inAndOutType` accurately.
- [ ] When a visitor whose last seen location was a single-direction door scans into a different room, the system logs an implicit departure breadcrumb from the previous door before logging entry to the new door.
- [ ] Taps on outer perimeter doors (`isPerimeter: true`) are flagged as perimeter crossing events.
- [ ] Unit tests verify single vs dual-direction event handling, implicit exit transitions, and perimeter tagging.

