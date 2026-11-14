# 01: Indonesian Dictionary & Page Guide Modal Component

**What to build:** Create the centralized Indonesian localization dictionary and the reusable, accessible Page Guide Modal component. The dictionary defines all human-friendly terms, action buttons, table headers, status badge translations, error messages, and rich per-page onboarding guide content (purpose, role, 1-2-3 operational steps, badge color definitions, and troubleshooting FAQs). The Page Guide Modal provides a consistent `📘 Panduan Halaman Ini` button in page headers that opens an accessible, beautifully styled dialog explaining how to operate that screen.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Centralized i18n dictionary created at `src/lib/vms/i18n/id.ts` with strongly-typed namespaces: `navigation`, `common`, `header`, `statusBadges`, `errors`, and `pages` (with rich guide content for reception, activeMonitoring, approvals, preRegistration, groupRegistration, accessLevels, visitors, and publicInvite).
- [x] Dictionary provides lay-friendly terminology mappings adhering to `GLOSSARY.md` and ADR 0005 (e.g. *Karyawan Tuan Rumah*, *Pendaftaran Tamu Terjadwal*, *Batas Buka Pintu*, *Melewati Batas Waktu*, *Masuk Otomatis Tanpa Antre*).
- [x] Reusable `PageGuideModal` component (`src/components/vms/page-guide-modal.tsx`) renders a clean header button and accessible modal dialog with focus trapping, backdrop blur, and Escape key dismissal.
- [x] Modal renders 5 structured sections based on the active `pageKey`: Penjelasan Tujuan, Peran Penanggung Jawab, Langkah Operasional 1-2-3, Arti Warna Status & Simbol, and Solusi Masalah Umum (FAQ).
- [x] Unit tests for dictionary completeness (`id.test.ts`) assert non-empty translation values, valid badge mappings, and presence of all required page keys.
- [x] Component tests (`page-guide-modal.test.tsx`) verify button rendering, dialog opening, section display, and dismiss interactions.

