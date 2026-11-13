# 02: Biometric Face Photo Capture, Normalization & Quality Verification

**What to build:** An internal Host or Receptionist can capture a visitor face photo via webcam or upload an image file. The system processes the image to output a compliant Base64 JPEG string strictly between 10 KB and 100 KB (stripping any `data:image/...;base64,` prefix for HikCentral wire payloads). When a target MinMoe access device is configured, the system optionally verifies the photo against HikCentral's `POST /artemis/api/acs/v1/faceCheck`. The normalized photo is bound to the visit in `faces[].faceData`, synchronized via `POST /artemis/api/visitor/v2/appointment` or `v2/appointment/update`, and the UI displays the photo preview alongside live credential sync status and a manual retry button.

**Blocked by:** 01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet

**Status:** ready-for-agent

- [ ] Image normalization utility converting webcam captures and file uploads into JPEG Base64 strictly between 10 KB and 100 KB.
- [ ] HikCentral adapter integration for optional `POST /artemis/api/acs/v1/faceCheck` (handling MinMoe device target and failure reporting).
- [ ] Wire integration of `faces[].faceData` in appointment creation and update payloads (`v2/appointment` / `v2/appointment/update`).
- [ ] Credential sync status tracking (`POST /artemis/api/visitor/v1/person/ID/elementDownloadDetail` and `POST /artemis/api/visitor/v1/auth/reapplication`).
- [ ] UI photo capture / upload widget with crop preview, file size feedback, and sync status badge with Retry button.
- [ ] Unit and integration tests covering image compression bounds, payload formatting, quality check responses, and reapplication triggers.

## Comments

