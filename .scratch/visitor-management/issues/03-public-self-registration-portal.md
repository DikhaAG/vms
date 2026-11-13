# 03: Public Self-Registration Portal (External Visitor Invitation Link)

**What to build:** An internal Host can click "Generate Invitation Link" to issue a cryptographically secure, time-bounded public URL (`/invite/[token]`). An external Visitor opens this link on their mobile device or desktop browser without logging into internal VMS, views the meeting invitation details, facility guidelines, and local visiting window, fills in their identity and contact details, captures a selfie (with automatic 10–100 KB JPEG normalization), and submits the registration. The system updates the pending visit record in the database, binds the photo, notifies the host, and renders a completion view with a downloadable digital QR Pass and visiting instructions.

**Blocked by:**
- 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet
- 02: Biometric Face Photo Capture, Normalization & Quality Verification

**Status:** resolved

- [x] Token generation and validation mechanism for single-use, expiring self-registration links (`/invite/[token]`).
- [x] Public-facing responsive web page (`/invite/[token]/page.tsx`) with clear mobile-friendly layout and instructions.
- [x] Integrated selfie capture and photo upload component using the 10–100 KB JPEG normalizer.
- [x] Backend route handler validating visitor input, updating the `Visit` record, and synchronizing data to HikCentral.
- [x] Digital QR Pass confirmation card with downloadable pass and copy-to-clipboard invite details.
- [x] Tests covering token validation, expiration, invalid token handling, self-registration submission, and security sanitization.

## Comments
- Implemented isomorphic `invitation-contract.ts` with pure validation logic for invite creation and self-registration submission.
- Extended `IVmsRepository` and `InMemoryVmsRepository` with `createInvitationToken`, `getInvitationToken`, `getVisitByInvitationToken`, and `consumeInvitationToken`.
- Created `invitation-service.ts` for cryptographically secure token generation (single-use, time-bounded with 7-day or visit-end expiry), validation, and public metadata retrieval.
- Created `self-registration-service.ts` connecting visitor submission with 10–100 KB biometric face normalization, HikCentral OpenAPI appointment dispatch, Visit state advancement (`DRAFT` -> `PENDING_APPROVAL`), and single-use token consumption.
- Implemented Next.js route handlers `GET /api/vms/invite/[token]` (metadata), `POST /api/vms/invite/[token]` (self-registration submission), and `POST /api/vms/invite` (host invite generation).
- Created mobile-friendly public portal UI in `src/app/invite/[token]/page.tsx` & `invite-form.tsx` featuring real-time biometric size badges, camera selfie capture, photo upload, invalid/expired/consumed states, and digital QR Pass confirmation view.
- Added "Create Invite Link" button and link copy drawer in the internal host pre-registration form (`src/app/vms/pre-registration/pre-registration-form.tsx`).
- Verified complete suite with 156 passing tests (including E2E tracer bullet flow), clean typecheck, lint, and production Next.js build.
