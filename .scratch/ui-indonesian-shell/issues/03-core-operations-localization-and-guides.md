# 03: Core Operations Localization & Page Guides

**What to build:** Refactor the primary daily front-desk and security operations pages to use 100% natural, polite Indonesian from the centralized dictionary and integrate the `PageGuideModal` component. Covers Front-Desk Reception (`/vms/reception`), Active Presence & Door Monitoring (`/vms/active-monitoring` including the Emergency Access Modal), and Approval Workflow (`/vms/approvals`).

**Blocked by:** 02: App Shell, Responsive Sidebar & Global Header

**Status:** ready-for-agent

- [ ] Meja Resepsionis (`/vms/reception`):
  - Form search, walk-in creation, identity check, and badge print actions translated to clear Indonesian.
  - Page header embeds `PageGuideModal` with `pageKey: "reception"`.
- [ ] Monitoring Kehadiran & Akses Pintu (`/vms/active-monitoring`):
  - Active visitor cards, location tags, directionality badges (`Dual-Direction` ➡️ `Pintu Dua Arah`, `Single-Direction In` ➡️ `Pintu Masuk Saja`), movement breadcrumbs with `(Keluar Otomatis)` tags, and checkout buttons localized.
  - Emergency Access Modal (`emergency-access-modal.tsx`) translated into clear Indonesian (`Izin Akses Pintu Darurat Sementara`, `Pilih Pintu`, `Alasan Justifikasi`, `Durasi`).
  - Page header embeds `PageGuideModal` with `pageKey: "activeMonitoring"`.
- [ ] Persetujuan Kunjungan (`/vms/approvals`):
  - Approval queue, screening checklist (Monitoring List / Daftar Pantauan Keamanan), reject reasons, and approval confirmations localized.
  - Page header embeds `PageGuideModal` with `pageKey: "approvals"`.
- [ ] Replaces cryptic technical error messages with actionable Indonesian error banners.
- [ ] Route and client unit tests updated and passing without regressions in behavior.
