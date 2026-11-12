# HikCentral OpenAPI Foundation Map

**Label:** `wayfinder:map`

## Destination

Membangun fondasi teknis integrasi HikCentral Professional OpenAPI V3.1.1 yang terverifikasi (signing `HmacSHA256`, server-side HTTP client wrapper, dan UI tes koneksi `/artemis/api/common/v1/version`) di atas arsitektur **Next.js 16 (App Router), TypeScript, dan Tailwind CSS v4**, serta menentukan modul bisnis pertama yang paling tepat untuk diimplementasikan berikutnya.

## Notes

- **Product Owner:** User mengambil keputusan langsung (tanpa stakeholder eksternal).
- **Pendekatan:** Bottom-up berbasis [HikCentral Professional OpenAPI V3.1.1 Developer Guide](../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md).
- **Target Arsitektur:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4.
- **Execution Override:** Peta ini secara eksplisit menyertakan tiket eksekusi fondasi (`task` dan `prototype`) bersama tiket keputusan (`research`) sesuai arahan Product Owner.
- **Domain Docs:** `GLOSSARY.md` dan `docs/adr/` belum dibuat; buat secara lazy lewat `/domain-modeling` saat istilah domain atau keputusan arsitektural yang sulit dibalik mulai terkunci.

## Decisions so far

<!-- Diisi otomatis dengan context pointer tiap kali tiket diselesaikan -->
- [Implementasi Utilitas HTTP Signature HmacSHA256](issues/01-hikcentral-hmac-sha256-signature.md): Utilitas murni `signHikCentralRequest` di [`src/lib/hikcentral/signature.ts`](../../src/lib/hikcentral/signature.ts) + bootstrap Next.js 16/TS/Tailwind v4/Vitest selesai (6/6 test & `tsc --noEmit` lulus), membuka blokir tiket wrapper HTTP Client.
- [Pembuatan Wrapper HTTP Client Standar HikCentral](issues/02-hikcentral-http-client-wrapper.md): Client server-side `createHikCentralClient` & `loadHikCentralConfigFromEnv` di [`src/lib/hikcentral/client.ts`](../../src/lib/hikcentral/client.ts) selesai (16/16 total test & `tsc --noEmit` lulus), membuka blokir tiket prototipe tes koneksi.
- [Riset Modul Bisnis Selanjutnya](issues/04-research-next-business-module.md): Rekomendasi modul bisnis pertama adalah **Visitor Management** (Bab 4.6 / 5.7) karena 100% REST JSON + Base64, prasyarat opsional (`receptionistId`, `accessLevelList`), dan closed-loop lifecycle ringkas (5–6 endpoint MVP); jika `vms` berarti *Video Management System*, mulai dari Camera Directory + Snapshot (`regions`, `cameras`, `camera/capture`) sebelum streaming player.
- [Prototipe UI Tes Koneksi ke Endpoint Version](issues/03-connection-test-version-ui.md): Use-case [`checkHikCentralVersion`](../../src/lib/hikcentral/version.ts), endpoint [`POST /api/hikcentral/version`](../../src/app/api/hikcentral/version/route.ts), dan halaman [`/prototype/version-check`](../../src/app/prototype/version-check/page.tsx) selesai (25/25 test, `tsc --noEmit`, dan `next build` lulus) dengan mode `live` & `stub` serta validasi `userId` Bab 5.1.1.

## Not yet specified

- **Lingkungan & Kredensial HikCentral Server:** Alamat server (`serverAddress`, `serverPort`), `AppKey`, `AppSecret`, `userId` header (Bab 5.1.1), serta strategi kepercayaan sertifikat HTTPS self-signed/on-prem (Bab 2.2.1).
- **Arah Modul Bisnis Pertama & Makna `vms`:** Pemilihan modul setelah fondasi selesai (menunggu keputusan Product Owner atas hasil riset [Riset Modul Bisnis Selanjutnya](issues/04-research-next-business-module.md)) serta klarifikasi fokus produk `vms` (Visitor Management System vs Video Management System vs portal multi-modul).

## Out of scope

- Implementasi fitur bisnis penuh (Visitor Management, Access Control, Video, Event/Alarm, dll.) sebelum fondasi autentikasi dan koneksi terverifikasi.
- Multi-tenant partner management atau abstraksi gateway untuk platform selain HikCentral OpenAPI V3.1.1.

