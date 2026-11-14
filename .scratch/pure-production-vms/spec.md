# Spec: Pure Production VMS with Local PostgreSQL and HikCentral Gateway Integration

## Overview

Transform the Visitor Management System (`/vms`) from a development/simulation prototype into a 100% production-ready enterprise application. All operations will execute live against the physical HikCentral OpenAPI gateway, backed by a dedicated local PostgreSQL database (via Drizzle ORM). All simulation/stub controls and dummy records are eliminated, replaced with informative empty states, authoritative door topology synchronized directly from HikCentral, and explicit hardware execution notices.

---

## Architectural Decisions & Constraints

- **ADR 0001**: Hybrid application state with HikCentral OpenAPI as execution engine.
- **ADR 0006**: Pure Production VMS with Local PostgreSQL (`PostgresVmsRepository`) and HikCentral-Authoritative Doors (`POST /artemis/api/resource/v1/acsDoor/acsDoorList`).
- **Zero Mock UI**: No "Simulasi Stub" or "Mode Eksekusi" selectors in `/vms/*` or `/invite/*`.
- **Zero Fake Data by Default**: No `DEFAULT_VISITS`, `DEFAULT_VISITOR_PROFILES`, or fake doors in production runtime. All tables render clean, friendly empty states until live data exists.
- **Strict Hardware Single-Source-of-Truth**: Physical doors and readers exist only as mirrored from HikCentral controllers. Manual door text inputs in VMS are removed.
- **Explicit Hardware Feedback**: Confirmation dialogs for critical physical actions (Emergency door open/lock, forced check-out) and proof-of-dispatch receipts (`appointRecordId`, ticket code) on success.

---

## Technical Specifications

### 1. Database & Persistence Layer (PostgreSQL + Drizzle ORM)
- **Dependencies**: `drizzle-orm`, `pg`, `@types/pg`, `drizzle-kit`.
- **Environment**: `DATABASE_URL=postgresql://user:password@localhost:5432/vms_db`.
- **Schema Tables**:
  - `facilities`: site ID, name, IANA timezone, address.
  - `facility_doors`: `doorIndexCode`, `doorName`, `facilityId`, `channelNo`, `accessType` (DUAL_DIRECTION / SINGLE_DIRECTION_IN), `isPerimeter`, `roomTimeoutMinutes`.
  - `access_levels`: `id`, `facilityId`, `name`, `description`, `timeScheduleId`, `doors` (JSON string array of doorIndexCodes), `floors`, `isDefault`.
  - `host_employees`: `id`, `personCode`, `name`, `email`, `phone`, `departmentName`, `orgIndexCode`.
  - `visitor_profiles`: `id`, `certificateType`, `certificateNo`, `familyName`, `givenName`, `phone`, `email`, `encryptedFaceDataUri`, `retained`, `lastVisitAt`.
  - `visits`: full Visit entity including `appointRecordId`, `appointCode`, `qrCodePassDataUri`, status, time windows, tap quotas, and audit events.
  - `invitation_tokens`: token, visitId, expiresAt, isConsumed.
  - `emergency_grants`: grantId, visitId, doorIndexCodes, reason, startsAt, expiresAt, status.
- **Auto-Initialization**: Schema automatically creates tables if not existing upon app startup (`initPostgresDb()`).
- **Repository Interface**: `PostgresVmsRepository` implements `IVmsRepository`.

### 2. HikCentral Door Synchronization Adapter
- **Adapter**: `src/lib/vms/hikcentral-door-adapter.ts`
  - Function: `syncHikCentralDoors(options?: { client?: HikCentralClient })`
  - Endpoint: `POST /artemis/api/resource/v1/acsDoor/acsDoorList`
  - Body: `{ pageNo: 1, pageSize: 500 }`
  - Extracts: `doorIndexCode`, `doorName`, `channelNo`, `regionIndexCode`.
  - Maps to `FacilityDoor` with automatic perimeter detection (turnstiles/speedgates).
  - Persists to `repository.saveDoors(doors)`.
- **Route Handler**: `POST /api/vms/sync/doors` to trigger sync on demand.

### 3. UI Refactoring: Stripping Stubs & Authoritative Doors
- **`/vms/access-levels`**:
  - Remove manual door text input and "Preset Pilihan Cepat".
  - Add "Sinkronkan Pintu dari Server HikCentral" button with loading indicator.
  - Render selectable interactive checklist of doors fetched directly from the database/HikCentral.
- **`/vms/pre-registration`**:
  - Remove Section 7 (Mode Eksekusi & Skenario Stub).
  - Remove `mode` and `stubScenario` state and inputs.
- **`/vms/reception`**:
  - Remove `Gateway: STUB / LIVE` toolbar control.
  - Remove any "Reset Dummy Data" controls.
- **`/vms/active-monitoring`**:
  - Remove `Mode Eksekusi Gateway` top banner.
- **`/invite/[token]`**:
  - Remove debug mode/stub selectors.

### 4. Empty State Architecture
- Render informative Indonesian empty states when arrays are empty:
  - Reception: *"Belum Ada Kunjungan Terdaftar Hari Ini. Buat jadwal kunjungan baru melalui menu Pra-Registrasi atau layani tamu datang langsung (Walk-in)."*
  - Monitoring: *"Tidak Ada Tamu Aktif di Dalam Gedung. Seluruh tamu telah selesai berkunjung atau belum melakukan check-in."*
  - Approvals: *"Tidak Ada Permohonan Kunjungan Tertunda. Seluruh permohonan kunjungan telah disetujui atau ditolak."*
  - Access Levels: *"Belum Ada Pintu Fisik yang Terdaftar. Klik tombol 'Sinkronkan Pintu dari Server HikCentral' untuk menarik data pintu dari gateway gedung."*
  - Visitors: *"Buku Tamu Masih Kosong. Data profil dan riwayat kunjungan tamu akan otomatis tercatat di sini setelah pendaftaran diproses."*

### 5. Hardware Transparency & Connection Health
- **Header Status Badge**:
  - Component: `HikCentralStatusBadge` inside [src/components/vms/header.tsx](file:///Users/a69/Desktop/DESKTOP/TAM/vms/src/components/vms/header.tsx).
  - Pings `POST /api/hikcentral/version`.
  - Shows green badge: `HikCentral Terhubung (V3.1.1)` or amber/red: `HikCentral Terputus / Belum Dikonfigurasi`.
- **Action Confirmation Dialogs**:
  - Emergency Door Open/Lock: Modal warning with danger styling.
  - Forced Check-Out: Warning modal.
- **Hardware Transaction Toast**:
  - On successful dispatch, render notification with official machine proof (`appointRecordId`, ticket code, controller sync confirmation).

