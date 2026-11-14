---
status: accepted
---

# Indonesian Localization, Impeccable App Shell, and Guided Onboarding Modals

We will adopt a centralized Indonesian localization dictionary, an Impeccable Operate-mode App Shell featuring a collapsible/responsive sidebar, and accessible, standardized per-page guide modals across all operational VMS routes.

## Considered Options

- **English-only technical interface**: Retaining raw technical terminology (e.g. "Artemis Privilege Groups", "Tap Quotas", "Overstay Grace", "Fast-Track Auto Check-In") in English without a cohesive sidebar layout.
- **Scattered inline translations**: Ad-hoc hardcoded Indonesian strings spread across individual TSX pages without unified terminology or onboarding help.
- **Centralized dictionary + Impeccable Operate-mode App Shell + Guided Modals**: Managing all user-facing text via `src/lib/vms/i18n/id.ts`, wrapping `/vms/*` in a responsive App Shell with grouped workflow navigation, and providing a persistent "Panduan Halaman" (Page Guide) modal on every feature page.

## Consequences

- Staf operasional (resepsionis, satpam, karyawan tuan rumah) dapat mengoperasikan sistem dengan bahasa Indonesia yang natural, lugas, dan bebas dari jargon teknis Artemis/HTTP.
- Navigasi harian tertata rapi dalam 3 kelompok alur kerja: Operasional Utama (Meja Resepsionis, Monitoring Tamu & Pintu, Persetujuan Kunjungan), Pendaftaran Undangan (Janji Temu Pribadi, Rombongan), dan Master Keamanan (Hak Akses Pintu, Buku Tamu).
- Petugas baru atau pengguna awam dapat langsung memahami tujuan halaman, peran pengguna, langkah 1-2-3, arti warna status, dan solusi masalah umum melalui tombol modal panduan di setiap halaman.
- Halaman publik tamu mandiri (`/invite/[token]`) tetap terisolasi tanpa sidebar staf gedung, optimal untuk perangkat smartphone tamu dari luar.

