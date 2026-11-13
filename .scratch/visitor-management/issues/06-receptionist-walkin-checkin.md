# 06: Front-Desk Receptionist Walk-in & Fast Check-in

**What to build:** A dedicated front-desk dashboard for Receptionists. Receptionists can perform fast visitor lookup by name, identity number (`certificateNo`), or QR code scan, verify the visitor's identity and face photo, and execute one-click Check-in via `POST /artemis/api/visitor/v1/registerment`. For unscheduled visitors arriving at the lobby, the Receptionist can perform an immediate Walk-in registration (assigning an available Host and Access Level). The visit transitions to `CHECKED_IN`, hardware credential distribution is triggered across access controllers, and live terminal synchronization status is displayed.

**Blocked by:**
- 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet
- 02: Biometric Face Photo Capture, Normalization & Quality Verification
- 05: Dynamic Access Level Management (Door/Floor Bundling & Tap Quota)

**Status:** ready-for-agent

- [ ] Front-desk lookup engine supporting search by name, phone, identity number, and QR code token.
- [ ] Check-in adapter invoking `POST /artemis/api/visitor/v1/registerment` and updating local visit status to `CHECKED_IN`.
- [ ] Walk-in registration form for front-desk staff with Host selector, Access Level picker, photo capture, and instant check-in.
- [ ] Hardware sync trigger and real-time element download detail monitoring (`visitor/v1/person/ID/elementDownloadDetail`).
- [ ] Receptionist UI with queue view, visitor verification modal, and one-click check-in button.
- [ ] Tests covering walk-in creation, pre-registered check-in, check-in updates, and terminal sync verification.

## Comments

