# 02: App Shell, Responsive Sidebar & Global Header

**What to build:** Implement the unified VMS App Shell layout at `/vms/layout.tsx` incorporating a persistent desktop sidebar with workflow grouping, a collapsible mode for expanded table viewing, an accessible mobile slide-out drawer (< 1024px) with hamburger menu, a global header with facility switching, real-time local timezone clocks, live hardware connection status (`🟢 Sistem Terhubung`), operator profile chip, and breadcrumb path indicators.

**Blocked by:** 01: Indonesian Dictionary & Page Guide Modal Component

**Status:** ready-for-agent

- [ ] Unified App Shell layout component implemented at `src/app/vms/layout.tsx` wrapping all internal `/vms/*` feature routes.
- [ ] Sidebar component (`src/components/vms/sidebar.tsx`) groups navigation into:
  - **Operasional Utama**: Meja Resepsionis (`/vms/reception`), Monitoring Tamu & Pintu (`/vms/active-monitoring`), Persetujuan Kunjungan (`/vms/approvals`).
  - **Pendaftaran Undangan**: Buat Undangan Tamu (`/vms/pre-registration`), Pendaftaran Rombongan (`/vms/group-registration`).
  - **Master Keamanan**: Hak Akses Pintu (`/vms/access-levels`), Buku Tamu & Biometrik (`/vms/visitors`).
- [ ] Sidebar indicates active route with contrast highlight and supports desktop collapse/expand toggle.
- [ ] Responsive sliding mobile drawer backed by overlay backdrop for viewports < 1024px, toggled via header hamburger button.
- [ ] Global header component (`src/components/vms/header.tsx`) features:
  - Facility selector with synchronized live local timezone clocks (WIB / WITA / WIT).
  - Hardware system health indicator (`🟢 Sistem Terhubung`).
  - Active operator profile avatar and role chip (`👤 Petugas Resepsionis Lobi`).
- [ ] Breadcrumbs bar renders active route hierarchy in plain Indonesian.
- [ ] Component tests verify desktop rendering, active link detection, mobile drawer open/close behavior, and keyboard navigation.

