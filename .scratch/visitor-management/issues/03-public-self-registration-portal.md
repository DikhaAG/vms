# 03: Public Self-Registration Portal (External Visitor Invitation Link)

**What to build:** An internal Host can click "Generate Invitation Link" to issue a cryptographically secure, time-bounded public URL (`/invite/[token]`). An external Visitor opens this link on their mobile device or desktop browser without logging into internal VMS, views the meeting invitation details, facility guidelines, and local visiting window, fills in their identity and contact details, captures a selfie (with automatic 10–100 KB JPEG normalization), and submits the registration. The system updates the pending visit record in the database, binds the photo, notifies the host, and renders a completion view with a downloadable digital QR Pass and visiting instructions.

**Blocked by:**
- 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet
- 02: Biometric Face Photo Capture, Normalization & Quality Verification

**Status:** ready-for-agent

- [ ] Token generation and validation mechanism for single-use, expiring self-registration links (`/invite/[token]`).
- [ ] Public-facing responsive web page (`/invite/[token]/page.tsx`) with clear mobile-friendly layout and instructions.
- [ ] Integrated selfie capture and photo upload component using the 10–100 KB JPEG normalizer.
- [ ] Backend route handler validating visitor input, updating the `Visit` record, and synchronizing data to HikCentral.
- [ ] Digital QR Pass confirmation card with downloadable pass and copy-to-clipboard invite details.
- [ ] Tests covering token validation, expiration, invalid token handling, self-registration submission, and security sanitization.

## Comments

