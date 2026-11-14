# 04: Invitation, Security & Public Self-Registration Localization

**What to build:** Localize the visit registration and security management pages into clear Indonesian and integrate `PageGuideModal`. Refactor the public visitor self-registration portal (`/invite/[token]`) on smartphones to provide warm, polite Indonesian onboarding instructions, camera selfie capture tips, and digital QR access passes without internal operator chrome.

**Blocked by:** 02: App Shell, Responsive Sidebar & Global Header

**Status:** ready-for-agent

- [ ] Pendaftaran Tamu Terjadwal (`/vms/pre-registration`):
  - Form fields, host selector, appointment scheduling, and selfie upload guides translated to Indonesian.
  - Page header embeds `PageGuideModal` with `pageKey: "preRegistration"`.
- [ ] Pendaftaran Rombongan (`/vms/group-registration`):
  - Group details, member batch roster, and shared access level configuration localized.
  - Page header embeds `PageGuideModal` with `pageKey: "groupRegistration"`.
- [ ] Hak Akses Pintu (`/vms/access-levels`):
  - Door bundles, floor selectors, time schedules, and physical tap quotas localized.
  - Page header embeds `PageGuideModal` with `pageKey: "accessLevels"`.
- [ ] Buku Tamu & Biometrik (`/vms/visitors`):
  - Visitor directory, certificate lookup, biometric retention policy tags, and soft-delete confirmation localized.
  - Page header embeds `PageGuideModal` with `pageKey: "visitors"`.
- [ ] Public Guest Self-Registration Portal (`/invite/[token]`):
  - Clean, dedicated mobile-first layout without operator sidebar or header chrome.
  - Polite Indonesian instructions guiding the guest to fill identity details and take an unobstructed selfie photo (good lighting, no masks/sunglasses).
  - Displays clear digital QR access pass and turnstile entry instructions upon successful registration.
- [ ] Unit and component tests verify form submissions, public invite validation, and localized render output.
