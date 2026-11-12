# Riset Modul Bisnis Selanjutnya Setelah Fondasi

Type: research
Status: resolved
Blocked by: None

## Question

Berdasarkan dokumentasi HikCentral Professional OpenAPI V3.1.1, modul bisnis apa (misal: Visitor Management vs Access Control vs Video Application vs Resource Management) yang paling mudah dan bernilai untuk diimplementasikan selanjutnya setelah fondasi autentikasi dan HTTP client selesai?

## Context & References

- **Sumber primer:** [HikCentral Professional OpenAPI V3.1.1 Developer Guide](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md) (Bab 4 Typical Applications & Bab 5 API Reference).
- **Kriteria evaluasi:**
  - Ketergantungan prasyarat resource (misal butuh sinkronisasi Person, Organization, Access Point, atau Camera `indexCode` terlebih dahulu).
  - Jumlah dan kompleksitas endpoint serta state lifecycle-nya.
  - Kebutuhan infrastruktur tambahan di browser/server (misal protokol streaming RTSP/WebSocket/player untuk Video vs REST JSON murni untuk Visitor Management / Resource Management).
  - Relevansi terhadap nama proyek `vms` (apakah mengarah ke Visitor Management System atau Video Management System) dan kemudahan verifikasi end-to-end.
- **Catatan urutan kerja:** Meskipun riset dokumen dapat dilakukan sekarang untuk menyiapkan keputusan, implementasi modul terpilih baru dimulai setelah tiket fondasi `01`–`03` selesai.

## Answer

Modul bisnis yang paling mudah, mandiri, dan bernilai untuk diimplementasikan pertama kali setelah fondasi (`01`–`03`) adalah **Visitor Management** (Bab 4.6 & Bab 5.7, 25 endpoint total / 5–6 endpoint untuk MVP), didukung lookup opsional *read-only* dari Resource Management (`person/advance/personList`) dan Access Control (`acs/v1/privilege/group`).

- **Alasan utama:** 100% REST JSON + Base64 (tanpa plugin Windows/RTSP/media proxy milik Video Application maupun inbound webhook milik Event & Alarm), prasyarat `receptionistId` dan `accessLevelList` bersifat opsional, serta memiliki *closed-loop lifecycle* lengkap (`v2/appointment` -> `v1/registerment` -> `v1/register/getVistorRegisterRecord` -> `v1/visitor/out`).
- **Catatan ambiguitas `vms`:** Jika `vms` dimaksudkan sebagai *Video Management System* (mengacu pada istilah `VMSPlatform` di Bab 1.7), hindari langsung membangun *live streaming player* pada fase awal dan mulailah dari direktori kamera + snapshot REST (`regions`, `cameras`, `video/v1/camera/capture`).

Laporan lengkap dengan perbandingan 5 kandidat modul serta rujukan bab, endpoint, dan nomor baris tersedia di [04-next-business-module.md](../research/04-next-business-module.md).

