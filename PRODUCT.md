# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Petugas Resepsionis (Receptionist)**: Front-desk staff processing walk-in visitors, validating identity documents, capturing live photos, issuing QR/face credentials, and managing physical check-in and check-out during operating hours.
- **Petugas Keamanan / Satpam (Security Officer)**: Security monitoring operators overseeing real-time visitor movement, facility door telemetry, overstay alerts, monitoring lists (denied entry / blacklists), and granting time-bounded emergency door access.
- **Karyawan Tuan Rumah (Host)**: Internal corporate employees scheduling individual or group visits, sending self-registration links, and remaining accountable for visitor conduct on site.
- **Pejabat Penyetuju (Approver)**: Designated department managers or security leads reviewing and approving/rejecting visit requests prior to hardware credential synchronization.
- **Tamu / Pengunjung (External Visitor)**: Outside guests receiving invitations, completing smartphone pre-registration (`/invite/[token]`) with selfie face photos, and using QR or face biometric credentials at speedgates/turnstiles.

## Product Purpose

An enterprise Visitor Management System (VMS) bridging corporate guest scheduling, identity verification, multi-facility timezone coordination, and automated physical access control via HikCentral hardware. Success means zero unauthorized access, sub-30-second receptionist check-in, seamless fast-track biometric entry for pre-approved guests, and clear, stress-free operation for Indonesian lay staff.

## Positioning

Delivers industrial-grade physical access integration (HikCentral OpenAPI V3.1.1, perimeter speedgates, turnstiles, biometric face terminals) paired with a high-density, polite Indonesian interface tailored for non-technical security guards and receptionists. Unlike generic visitor log tools, enforces hybrid state synchronization (local high-speed Next.js/Postgres operational store with resilient background hardware synchronization) and strict facility-based timezone calculations across Indonesia (WIB/WITA/WIT).

## Operating Context

- Corporate headquarters, branch offices, and industrial factory campuses throughout Indonesia spanning multiple timezones (Asia/Jakarta WIB, Asia/Makassar WITA, Asia/Jayapura WIT).
- High-throughput lobby reception desks equipped with desktop workstations and webcams, security guard command posts with multi-monitor monitoring, and mobile smartphones used by external visitors over cellular connections.
- Hardware environment: HikCentral OpenAPI V3.1.1 controllers, physical perimeter doors, speedgates, turnstiles, and biometric face terminals.

## Capabilities and Constraints

- **Core Workflows**: Pre-registration (single & group), self-registration link generation, walk-in registration, multi-tier approvals, fast-track biometric check-in, real-time access monitoring, overstay tracking with grace periods, and emergency door access grants.
- **Localization Contract**: All internal UI must use natural, polite Indonesian from `src/lib/vms/i18n/id.ts` and `GLOSSARY.md`. Zero raw technical jargon ("Artemis", "Privilege Groups", "HTTP 500", "Unhandled Exception").
- **Layout Isolation**: Public guest portal (`/invite/[token]`) must remain strictly isolated without internal app shell, sidebars, or internal navigation.
- **Timezone Rules**: Visit validity windows, overstay evaluations, and hardware activations are bound strictly to Facility IANA timezones (ADR 0002).
- **Privacy Compliance**: Biometric face photos and personal identification data are subject to automated soft-delete and retention policies adhering to Indonesian personal data protection regulations (UU PDP / ADR 0004).

## Brand Commitments

- **Name**: Visitor Management System (VMS).
- **Tone of Voice**: Formal, polite, clear, respectful, and accessible standard Indonesian ("Baku, sopan, dan ramah pengguna awam").
- **UI Density & Mode**: Impeccable Operate Mode. High-density data tables, accessible contrast, collapsible desktop navigation (`w-64` / `w-18`), responsive mobile drawers, and standardized 5-section operational help modals (`📘 Panduan Halaman Ini`).

## Evidence on Hand

- HikCentral OpenAPI V3.1.1 developer guide indexing: `docs/reference/README.md`.
- Architectural Decision Records:
  - `docs/adr/0001-hybrid-state-and-hikcentral-execution.md` (Hybrid State)
  - `docs/adr/0002-facility-timezone-and-utc-storage.md` (Facility Timezone)
  - `docs/adr/0003-multi-facility-saas-architecture.md` (Multi-Facility SaaS)
  - `docs/adr/0004-biometric-retention-and-soft-delete.md` (Biometric Retention & Soft Delete)
  - `docs/adr/0005-indonesian-localization-and-user-friendly-app-shell.md` (Indonesian Localization & App Shell)
- Centralized UI dictionary: `src/lib/vms/i18n/id.ts`.
- Domain vocabulary: `GLOSSARY.md`.
- Coding standards: `CODING_STANDARDS.md`.
- Automated regression suite: 72 test suites, 596 tests passing.

## Product Principles

1. **Ramah Awam, Nol Jargon**: Clear, dignified Indonesian wording throughout all operator touchpoints without exposing backend or hardware complexities.
2. **Operate First, High Scanability**: Essential operational indicators (status badges, time remaining, door states) visible at a glance without modal overload.
3. **Hybrid Hardware Resilience**: Local database operations never stall on physical device latency; sync state is transparent and recoverable.
4. **Konteks Fasilitas & Waktu Nyata**: Every time display and validation rule is locked to the specific facility's timezone.
5. **Privasi & Keamanan Ketat**: Biometric assets and access privileges are time-bounded, auditable, and automatically purged upon visit completion.

## Accessibility & Inclusion

- WCAG 2.1 AA compliant color contrast across all status badges and alerts.
- Full keyboard navigation: focus traps on all modals/sheets, Escape key listeners, and accessible ARIA attributes (`aria-expanded`, `aria-label`, `aria-labelledby`).
- Explicit form label associations (`htmlFor` matching input `id`).
- Responsive support down to 320px for visitor self-registration mobile screens.

