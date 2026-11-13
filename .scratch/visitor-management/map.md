# Visitor Management System (VMS) Map

**Label:** `wayfinder:map`

## Destination

Membangun modul bisnis enterprise **Visitor Management System (VMS)** berbasis Next.js 16 (App Router), TypeScript, Tailwind CSS v4, dan PostgreSQL dengan **HikCentral Professional OpenAPI V3.1.1** sebagai mesin eksekusi fisik (pendaftaran kunjungan, biometrik wajah, QR code pass berkuota tap, access level dinamis, alur persetujuan, deteksi overstay, dan pencabutan hak akses fisik instan saat check-out).

## Notes

- **Product Owner:** User mengambil keputusan langsung.
- **Spesifikasi Induk:** [spec.md](spec.md) (Status: `ready-for-agent`).
- **Domain Modeling & Glosarium:** Terikat pada [GLOSSARY.md](../../GLOSSARY.md) dan empat ADR:
  - [ADR-0001: Hybrid Application State with HikCentral Execution Engine](../../docs/adr/0001-hybrid-state-and-hikcentral-execution.md)
  - [ADR-0002: Facility Timezone Binding with UTC Storage](../../docs/adr/0002-facility-timezone-and-utc-storage.md)
  - [ADR-0003: Multi-Facility SaaS Architecture with Dynamic Expansion](../../docs/adr/0003-multi-facility-saas-architecture.md)
  - [ADR-0004: Indefinite Biometric Storage with Soft-Delete](../../docs/adr/0004-biometric-retention-and-soft-delete.md)
- **Fondasi Teknis:** Memanfaatkan utilitas signature dan client teruji dari sprint fondasi ([`src/lib/hikcentral/signature.ts`](../../src/lib/hikcentral/signature.ts) dan [`src/lib/hikcentral/client.ts`](../../src/lib/hikcentral/client.ts)).

## Decisions so far

<!-- Diisi otomatis dengan context pointer tiap kali tiket diselesaikan -->
- [01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet](issues/01-facility-setup-host-preregistration.md): Vertikal slice lengkap pre-registration selesai (commit `d41333b`). Menghasilkan isomorphic contract (`vms-contract.ts`), utilitas konversi IANA timezone offset (`timezone.ts`), in-memory repository (`repository.ts`), adapter `v2/appointment` HikCentral, service orchestrator (`pre-registration-service.ts`), route handler `/api/vms/pre-registration`, dan UI form di `/vms/pre-registration/` (69/69 tests dan `next build` lulus).
- [02: Biometric Face Photo Capture, Normalization & Quality Verification](issues/02-biometric-face-normalization-verification.md): Implementasi normalisasi biometrik wajah JPEG 10–100 KB (`face-normalizer.ts`), adapter HikCentral untuk `faceCheck`, `auth/reapplication`, dan `elementDownloadDetail` (`hikcentral-face-adapter.ts`), integrasi `faces[].faceData` pada wire payload `v2/appointment`, route handler retry sync (`/api/vms/credentials/retry-sync`), serta UI webcam capture/instant preview/sync retry di `/vms/pre-registration/` (109/109 tests dan `next build` lulus).

## Frontier

- [03: Public Self-Registration Portal (External Visitor Invitation Link)](issues/03-public-self-registration-portal.md) — `Status: ready-for-agent`, unblocked by 01 & 02.
- [04: Approval Workflow & Monitoring List (Blacklist) Screening](issues/04-approval-workflow-blacklist-screening.md) — `Status: ready-for-agent`, unblocked.
- [05: Dynamic Access Level Management (Door/Floor Bundling & Tap Quota)](issues/05-dynamic-access-level-tap-quota.md) — `Status: ready-for-agent`, unblocked.

## Issues Index

1. [01: Facility Setup & Multi-Timezone Host Pre-Registration Tracer Bullet](issues/01-facility-setup-host-preregistration.md) (Unblocked)
2. [02: Biometric Face Photo Capture, Normalization & Quality Verification](issues/02-biometric-face-normalization-verification.md) (Blocked by: 01)
3. [03: Public Self-Registration Portal (External Visitor Invitation Link)](issues/03-public-self-registration-portal.md) (Blocked by: 01, 02)
4. [04: Approval Workflow & Monitoring List (Blacklist) Screening](issues/04-approval-workflow-blacklist-screening.md) (Blocked by: 01)
5. [05: Dynamic Access Level Management (Door/Floor Bundling & Tap Quota)](issues/05-dynamic-access-level-tap-quota.md) (Blocked by: 01)
6. [06: Front-Desk Receptionist Walk-in & Fast Check-in](issues/06-receptionist-walkin-checkin.md) (Blocked by: 01, 02, 05)
7. [07: Active Visit Dashboard, Door Tap Quota Enforcement, Overstay Alert & Check-out](issues/07-active-monitoring-overstay-checkout.md) (Blocked by: 06)
8. [08: Multi-Visitor Group Visits & Returning Visitor Biometric Soft-Delete Management](issues/08-group-visits-biometric-soft-delete.md) (Blocked by: 01, 02, 06, 07)

## Out of scope

- Aplikasi mobile native (iOS/Android native binaries).
- Protokol hardware serial langsung/RS-485 atau flashing firmware (semua melalui HikCentral OpenAPI).
- Integrasi SSO pihak ketiga (SAML 2.0 / Okta / Azure AD) untuk MVP.
- Integrasi gateway berbayar WhatsApp / SMS pihak ketiga.

