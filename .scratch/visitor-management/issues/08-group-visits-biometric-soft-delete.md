# 08: Multi-Visitor Group Visits & Returning Visitor Biometric Soft-Delete Management

**What to build:** Group visit orchestration and visitor profile lifecycle management. A Host can pre-register a Group Visit (multiple visitors attending the same meeting) in a single UI form; the backend orchestrates individual visitor calls to HikCentral under a unified `visitorGroupName`, tracking them collectively in VMS. When an existing visitor's identity number (`certificateNo`) is entered, the system suggests their profile and stored face photo for one-click re-use. Administrators can soft-delete a visitor's profile and biometrics (marking `isDeleted = true`) for privacy compliance (PDP), while preserving historical visit logs and audit trails.

**Blocked by:**
- 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet
- 02: Biometric Face Photo Capture, Normalization & Quality Verification
- 06: Front-Desk Receptionist Walk-in & Fast Check-in
- 07: Active Visit Dashboard, Door Tap Quota Enforcement, Overstay Alert & Check-out

**Status:** ready-for-agent

- [ ] Group visit scheduling UI allowing addition of multiple visitors under one meeting booking.
- [ ] Backend orchestration executing individual HikCentral visitor creation calls grouped by `visitorGroupName`.
- [ ] Returning visitor lookup and auto-fill by `certificateNo` reusing saved profile and encrypted face photo.
- [ ] Soft-delete and restore capabilities for visitor profiles, upholding privacy compliance without compromising audit integrity.
- [ ] Group status overview in the visit dashboard showing attendance of all members in the group.
- [ ] Tests covering group orchestration, partial failure rollback/retry, auto-fill logic, and soft-delete behavior.

## Comments

