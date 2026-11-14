# Spec: Indonesian Localization, Impeccable App Shell, and Guided Onboarding Modals

Status: ready-for-agent

## Problem Statement

While the enterprise Visitor Management System possesses robust backend and domain capabilities—including multi-timezone pre-registration, biometric normalization, approval workflows, dynamic door quotas, fast-track perimeter auto check-in, and emergency access escalations—the user interface presents three major usability hurdles for operational personnel:

1. **Language and Technical Jargon Barrier:** The entire interface is currently in English, filled with technical terms (e.g. "Artemis", "Tap Quota", "Overstay Grace", "Implicit Transition", "Dual-Direction"), which causes friction, confusion, and hesitation for local Indonesian front-desk receptionists, building security guards, and internal employees.
2. **Fragmented, Flat Navigation:** Individual feature routes lack a cohesive, persistent App Shell. Operators navigating between reception walk-ins, approval queues, active monitoring, and door permissions must rely on ad-hoc links or browser back-buttons rather than a unified, responsive sidebar tailored to real-world facility workflows.
3. **Absence of Contextual Operational Guidance:** Non-technical staff, new receptionists, and temporary relief officers lack immediate guidance on how each page works, the operational 1-2-3 sequence to follow, the meaning of status color badges, and how to resolve common real-time dilemmas (e.g. failed face scans, early arrivals, or expired access).

## Solution

Deliver a cohesive, high-craft user experience adhering to the **Impeccable (Operate Mode)** design philosophy:

1. **Comprehensive Indonesian Localization via Centralized Dictionary:** All user-facing text, field labels, button actions, status badges, validation hints, and error banners will be localized into natural, polite, and professional Indonesian. Technical jargon is translated into intuitive, layman-friendly concepts (e.g. *Tap Quota* ➡️ *Jatah Buka Pintu*, *Host* ➡️ *Karyawan Tuan Rumah*, *Fast-Track* ➡️ *Masuk Otomatis Tanpa Antre*), governed by a centralized dictionary (`src/lib/vms/i18n/id.ts`) and ADR 0005.
2. **Ergonomic App Shell with Responsive Collapsible Sidebar:** Introduce a unified App Shell (`/vms/layout.tsx`) featuring:
   - A persistent, collapsible sidebar grouping workflows into **Operasional Utama** (Meja Resepsionis, Monitoring Tamu & Pintu, Persetujuan Kunjungan), **Pendaftaran Undangan** (Janji Temu Pribadi, Rombongan), and **Master Keamanan** (Hak Akses Pintu, Buku Tamu & Biometrik).
   - An accessible slide-out mobile drawer on screens < 1024px for tablet and smartphone patrolling.
   - A global header displaying facility selection, real-time local timezone clocks (WIB/WITA/WIT), live hardware connection indicators (`🟢 Sistem Terhubung`), and active operator role chips.
3. **Interactive Step-by-Step Page Guide Modals:** Deploy a standardized, accessible `PageGuideModal` component accessible via a persistent `📘 Panduan Halaman Ini` button in every feature page header. Each guide provides:
   - Plain-language summary of the page's objective.
   - Responsible user roles (Resepsionis / Satpam / Karyawan).
   - Practical step-by-step operational instructions (Langkah 1, 2, 3).
   - Visual cheat-sheet for badge colors and status symbols.
   - Quick actionable troubleshooting tips (FAQ ringkas).
4. **Isolated Mobile-First Guest Self-Registration:** The public guest invitation portal (`/invite/[token]`) remains isolated from internal staff sidebars, offering friendly Indonesian instructions for camera selfie capture and issuing clear digital QR access passes upon completion.

## User Stories

1. As a front-desk receptionist, I want all buttons, labels, and forms to use clear Indonesian language, so that I can process visitors without confusion over technical English terms.
2. As a receptionist, I want a persistent sidebar navigation that groups daily workflows into distinct operational categories, so that I can quickly jump between check-in, active monitoring, and approvals with one click.
3. As a security officer patrolling with a tablet or mobile device, I want the sidebar to collapse into an accessible drawer menu with a hamburger toggle, so that screen real estate is preserved for tables and monitoring feeds.
4. As a receptionist or security officer, I want a "Panduan Penggunaan Halaman Ini" button on every page header, so that I can open an in-depth operational guide whenever I need assistance.
5. As an onboarding receptionist, I want the guide modal to present a simple 1-2-3 step-by-step workflow, so that I understand the exact operational steps required on that screen.
6. As a security operator, I want the guide modal to explain status badge colors and symbols in plain Indonesian, so that I immediately know what green, yellow, red, and blue badges mean.
7. As an operator encountering an edge-case, I want the guide modal to feature a quick troubleshooting FAQ, so that I know what to do when face scans fail or visitors arrive early without panicking.
8. As a facility manager responsible for multiple branches, I want the global header to display a facility switcher with real-time local clock times (WIB, WITA, WIT), so that I am always aware of each facility's local operating hours.
9. As a security operator, I want the global header to display a live hardware connection indicator ("Sistem Pintu Terhubung"), so that I have immediate situational awareness of physical controller health.
10. As an operator, I want to see my current logged-in role ("Petugas Resepsionis Lobi") in the global header, so that I know which account permissions are currently active.
11. As an external visitor opening an invitation link on a mobile browser, I want a clean, dedicated self-registration screen in polite Indonesian without internal operator sidebars, so that I can submit my details seamlessly.
12. As an external visitor, I want clear selfie capture guidelines in plain Indonesian, so that I submit a photo with good lighting, no masks, and centered framing on my first try.
13. As an external visitor who has completed registration, I want to view my digital QR pass and arrival instructions in clear Indonesian, so that I know exactly which perimeter turnstiles to scan at the building entrance.
14. As an internal employee hosting a meeting, I want the pre-registration portal to use conversational Indonesian terms ("Karyawan Tuan Rumah", "Pendaftaran Tamu Terjadwal"), so that inviting business guests is frictionless.
15. As a security administrator, I want access levels and door configurations described in plain terms ("Hak Akses Pintu", "Jatah Buka Pintu"), so that permission rules can be audited without deciphering raw hardware indexes.
16. As a security supervisor viewing live attendance, I want room presence, door directionality, and implicit transitions clearly translated ("Pintu Dua Arah", "Perpindahan Ruangan Otomatis"), so that my team understands visitor whereabouts at a glance.
17. As an authorized operator granting emergency door access, I want the modal to use clear Indonesian prompts ("Izin Akses Pintu Darurat Sementara", "Alasan Justifikasi", "Pilih Pintu"), so that high-security escalations are documented accurately without misunderstanding.
18. As a developer maintaining the codebase, I want all user-facing text and guide content organized in a centralized dictionary module, so that wording updates can be made consistently in one place.
19. As a mobile operator using smaller screens, I want the sidebar and modals to trap focus properly and support keyboard navigation (Escape to close, Tab traversal), so that accessibility standards are fully satisfied.
20. As a security officer, I want raw API errors and technical stack traces translated into helpful, action-oriented Indonesian error banners, so that I am guided to corrective actions rather than seeing cryptic HTTP codes.

## Implementation Decisions

### 1. Centralized Indonesian Localization Dictionary
- Create `src/lib/vms/i18n/id.ts` declaring typed constants for:
  - `navigation`: Labels and descriptions for sidebar menu items and groups.
  - `common`: Global actions (Simpan, Batal, Tutup, Cari, Filter, Hapus, Detail, Salin).
  - `header`: Facility titles, time display formats, connection status chips, role labels.
  - `pages`: Page-specific headings, descriptions, table columns, form labels, and guide content for:
    - Reception (`reception`)
    - Active Monitoring (`activeMonitoring`)
    - Approvals (`approvals`)
    - Pre-Registration (`preRegistration`)
    - Group Registration (`groupRegistration`)
    - Access Levels (`accessLevels`)
    - Visitors Directory (`visitors`)
    - Public Invite (`publicInvite`)
  - `statusBadges`: Mapping of domain statuses (`PENDING_APPROVAL`, `APPROVED`, `CHECKED_IN`, `OVERSTAY`, `CHECKED_OUT`, `REJECTED`, `CANCELLED`) to Indonesian labels and badge visual styles.
  - `errors`: Human-friendly Indonesian error translations mapped from domain error kinds (`validation`, `not_found`, `config`, `upstream`, `conflict`).

### 2. App Shell Architecture (`/vms/layout.tsx`)
- Implement a responsive layout component encompassing:
  - **Sidebar Component (`src/components/vms/sidebar.tsx`)**:
    - Sticky desktop navigation with collapsible state (expanded vs icon-rail).
    - Grouped navigation links with active route highlighting using `usePathname()`.
    - Sliding mobile drawer backed by an overlay backdrop for viewport widths < 1024px.
  - **Header Component (`src/components/vms/header.tsx`)**:
    - Hamburger button toggle for mobile viewports.
    - Facility selector with synchronized local timezone clock updating every second.
    - System health badge (`🟢 Sistem Terhubung`).
    - Active operator profile avatar with role badge.
  - **Main Content Wrapper**:
    - Breadcrumb navigation component reflecting active path hierarchy.
    - Responsive padding and max-width containers maintaining high readability across all screen sizes.

### 3. Standardized Page Guide Modal Component (`src/components/vms/page-guide-modal.tsx`)
- Accessible modal dialog component triggered by a persistent button in each page header (`📘 Panduan Halaman Ini`).
- Structure:
  - Title and subtitle explaining page purpose.
  - "Peran Pengguna" card highlighting responsible roles.
  - "Langkah Operasional" numbered sequence cards with iconography.
  - "Arti Status & Warna" grid explaining status indicators.
  - "Solusi Masalah Umum (FAQ)" accordion or bulleted cards.
- Focus trap and Escape key dismissal for full accessibility.

### 4. Route-by-Route Content Refactoring
- Refactor each operational page client to consume strings from `src/lib/vms/i18n/id.ts`:
  - `src/app/vms/reception/`
  - `src/app/vms/active-monitoring/` (including `emergency-access-modal.tsx`)
  - `src/app/vms/approvals/`
  - `src/app/vms/pre-registration/`
  - `src/app/vms/group-registration/`
  - `src/app/vms/access-levels/`
  - `src/app/vms/visitors/`
- Refactor the public visitor invitation portal (`src/app/invite/[token]/page.tsx` and client component) to use polite Indonesian instructions for identity input, selfie capture tips, and digital badge generation.

## Testing Decisions

- **Test Philosophy:** Test user-visible outcomes and accessibility attributes at component and page seams. Verify that interactive dialogs open, trap focus, render localized strings, and close cleanly without mutating underlying domain models.
- **Seams Under Test:**
  - `src/lib/vms/i18n/id.test.ts`: Unit test asserting complete key coverage, non-empty translation strings, and status mapping validity.
  - `src/components/vms/sidebar.test.tsx`: Component test verifying desktop rendering, route active state detection, mobile drawer open/close behavior, and keyboard navigation.
  - `src/components/vms/page-guide-modal.test.tsx`: Component test verifying modal trigger button rendering, dialog opening, content rendering across different page keys, and dismissal on click/Escape.
  - UI regression tests for refactored pages ensuring form submissions, badge rendering, and event handlers remain fully functional with Indonesian text.
- **Prior Art:** Existing client tests (`src/app/vms/active-monitoring/active-monitoring-client.test.tsx`, `src/app/vms/active-monitoring/emergency-access-modal.test.tsx`).

## Out of Scope

- Multi-language runtime switching dropdown (English/Indonesian toggle) in the header (the current requirement is specifically full Indonesian for local lay users; the centralized dictionary structure will support future toggles seamlessly).
- Voice-over audio synthesis for the page guide steps.
- Backend database schema renaming (internal column names and API contracts remain English/isomorphic; translation is performed at the presentation layer).

## Further Notes

- Adheres strictly to ADR 0001 (Hybrid State), ADR 0002 (Timezone Normalization), and ADR 0005 (Indonesian Localization & Guided App Shell).
- Follows the Impeccable (Operate Mode) guidelines: high scannability, subtle micro-interactions, distinct contrast ratios for status chips, and crisp form inputs without autocorrect bugs.
- All modifications must pass `pnpm check` (100% test pass rate, 0 lint/typecheck errors) and maintain Turbopack production build compatibility (`pnpm build`).
