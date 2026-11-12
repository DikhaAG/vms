# Riset Modul Bisnis Selanjutnya Setelah Fondasi HikCentral OpenAPI

**Sumber Primer:** [HikCentral Professional OpenAPI V3.1.1 Developer Guide](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md) (Bab 1, Bab 4, dan Bab 5).

## Ringkasan Rekomendasi

**Rekomendasi utama:** Implementasikan **Visitor Management** (Bab 4.6 & Bab 5.7) sebagai modul bisnis pertama setelah fondasi autentikasi dan HTTP client (`01`–`03`) selesai, dengan dukungan minimal *read-only* dari **Resource Management** (Bab 4.2 & Bab 5.3) untuk lookup opsional host (`person/advance/personList`) dan access level visitor (`acs/v1/privilege/group`).

Alasan utamanya:
1. **100% REST JSON + Base64 murni** — tidak memerlukan plugin OS Windows, protokol streaming `RTSP`, media proxy, maupun *inbound webhook listener* yang harus diakses balik oleh server HikCentral.
2. **Ketergantungan prasyarat paling rendah** — `receptionistId` dan `accessInfo.accessLevelList` pada reservasi/check-in bersifat opsional (`Opt.`), dan `visitorGroupName` otomatis dibuat bila belum ada (Bab 4.6.4, baris 2438–2440; Bab 5.7.3 & 5.7.5, baris 19242–19277, 19813–19858).
3. **Closed-loop lifecycle dengan 5–6 endpoint inti** — mencakup alur lengkap `Appointment -> Check-in -> Record Query -> Check-out` beserta enum status pengunjung yang eksplisit (`-1` s.d. `9`, Bab 5.7.18, baris 21840–21846).

> **Catatan Ambiguitas Nama Proyek `vms`:**
> Dalam glosarium resmi HikCentral, `VMSPlatform` didefinisikan sebagai *"A platform for security video management"* (Bab 1.7, baris 460). Namun pada konteks aplikasi web Next.js `vms`, singkatan ini dapat berarti **Visitor Management System** atau **Video Management System**.
> - Jika `vms` adalah **Visitor Management System**, langsung lanjutkan ke **Visitor Management (Bab 4.6 / 5.7)**.
> - Jika `vms` ternyata dimaksudkan sebagai **Video Management System**, **jangan** langsung membangun *live video player* pada iterasi pertama; mulai dari **Resource Management (Camera & Area Directory, Bab 4.2 / 5.3.2–5.3.3)** ditambah **Snapshot REST (`POST /artemis/api/video/v1/camera/capture`, Bab 5.4.24)** terlebih dahulu sebelum merancang arsitektur streaming media (`HLS_S` / `WebSocket_S` / RTSP relay).

---

## Matriks Perbandingan Kandidat Modul

| Kriteria | Resource Management (Bab 4.2 / 5.2–5.3) | Event & Alarm (Bab 4.3 / 5.5) | Video Application (Bab 4.4 / 5.4) | Access Control (Bab 4.5 / 5.9) | Visitor Management (Bab 4.6 / 5.7) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Jumlah Endpoint** | **99 entri** (16 di Bab 5.2; 83 di Bab 5.3 / 82 URL unik) | **12 endpoint** (Bab 5.5.1–5.5.12, baris 17375–18257) | **35 endpoint** (33 URL unik di Bab 5.4.1–5.4.35, baris 13417–17240) | **12 endpoint** di Bab 5.9 + 2 endpoint auth di Bab 5.3.8 (baris 11147, 11201, 24309–25471) | **25 endpoint** (Bab 5.7.1–5.7.25, baris 18632–22421); **5–6 endpoint** cukup untuk MVP |
| **Prasyarat Resource** | **Nol** (penyedia `indexCode` & master data bagi modul lain; Bab 4.2.1, baris 1429–1432) | **Tinggi**: butuh `srcIndexs` dari Resource Management + subscription aktif sebelum query event (Bab 4.3.2, baris 1894–1912) | **Sedang–Tinggi**: butuh `regionIndexCode` & `cameraIndexCode` (Tabel 4-9), plus kamera & jadwal rekam aktif di HikCentral (baris 2059–2060) | **Tinggi**: wajib sinkronisasi Organization & Person, access level sudah ada, dan `doorIndexCode` dari `acsDoorList` (Bab 4.5.4, baris 2311–2319, 2352) | **Rendah**: `receptionistId` & `accessLevelList` bersifat `Opt.`; `visitorGroupName` auto-create (Bab 4.6.4 & 5.7.5) |
| **Kompleksitas State & Workflow** | CRUD / read-only direktori tanpa *business state machine* | Push-based async: subscribe -> HTTP webhook -> async queue -> acknowledge (baris 1848–1889) | Campuran sync/async: URL streaming, PTZ asinkron, download clip maks. 1 menit & transcoding MP4 (Bab 4.4.5, baris 2228–2237) | Terdistribusi ke hardware: assign privilege asinkron ke controller fisik + polling `applicationResult` / `reapplication` (baris 2333–2378) | State machine terdefinisi jelas di server (`reserved` -> `checked in` -> `checked out` / `expired`; Bab 5.7.18) |
| **Infrastruktur Tambahan (Next.js 16)** | **Tidak ada** (REST JSON murni) | **Butuh inbound HTTP/HTTPS callback (`eventDest`)** yang reachable dari server HikCentral + worker asinkron (baris 1853–1854, 1959–1962) | **Berat**: 3 opsi resmi (`C++/C# SDK`, `VideoWebPlugin`, `JsDecoder`) **hanya support Windows** (baris 2024, 2069–2095); browser butuh `hls.js` (H.264+AAC saja) atau media proxy RTSP | **Tidak ada di protocol** (REST JSON), tetapi butuh hardware pintu/reader fisik untuk verifikasi E2E bermakna | **Tidak ada** (REST JSON + gambar/QR Base64) |
| **Kesesuaian `vms` & Verifikasi E2E** | Pondasi lookup (`cameras`, `person`, `acsDoor`), belum bernilai bisnis penuh sendiri | Cocok sebagai modul lanjutan (notifikasi/audit), sulit diuji lokal jika server HikCentral on-prem tidak bisa memanggil localhost Next.js | Cocok jika `vms` = *Video Management System*, namun berisiko tinggi sebagai modul pertama karena kompleksitas player & codec | Cocok sebagai fase lanjutan setelah Visitor/Person berjalan karena menyentuh kendali fisik pintu | **Paling pas** jika `vms` = *Visitor Management System*; UI form + tabel + QR/PIN mudah diuji E2E |

---

## Analisis Detail Per Kandidat Modul

### 1. Visitor Management — Bab 4.6 (baris 2379–2534) & Bab 5.7 (baris 18585–22457)

- **Cakupan & Lifecycle:** Menyediakan siklus lengkap kunjungan (*closed-loop visit business*, Bab 4.6.1, baris 2394–2396):
  1. **Reservasi:** `POST /artemis/api/visitor/v2/appointment` (Bab 5.7.5, baris 19801), ubah/hapus (`v2/appointment/update`, `v1/appointment/single/delete`), daftar reservasi (`v1/appointment/appointmentlist`, Bab 5.7.9). Mendukung pengecekan otomatis terhadap monitoring list (Bab 4.6.4, baris 2440–2442) dan alur persetujuan (`automaticApproval`, `visitorApprovalFlow/details`, `visitorapprovalflow/status`, Bab 5.7.16–5.7.17, 5.7.20).
  2. **Check-in (Reserved maupun Walk-in):** `POST /artemis/api/visitor/v1/registerment` (Bab 5.7.3, baris 19224) yang menggantikan endpoint lama `v1/appointment` untuk check-in (baris 19227–19229). Jika reservasi sudah ada, `appointId` / `visitorId` digunakan untuk auto-fill data.
  3. **Kredensial & Tracking:** Ambil QR code Base64 (`POST /artemis/api/visitor/v1/visitor/qr/get`, Bab 5.7.23, baris 22303), PIN code 4–8 digit (`POST /artemis/api/visitor/v1/pincode/get`, Bab 5.7.25, baris 22421), dan cek status kunjungan via `POST /artemis/api/visitor/v1/appointment/getVisitorStatus` (Bab 5.7.18, baris 21803) serta riwayat check-in via `POST /artemis/api/visitor/v1/register/getVistorRegisterRecord` (Bab 5.7.19, baris 21858).
  4. **Check-out:** `POST /artemis/api/visitor/v1/visitor/out` (Bab 5.7.8, baris 20498) dengan hanya 1 field wajib di body (`appointRecordId`), yang otomatis mencabut hak akses pintu/lift visitor (Bab 4.6.4, baris 2509–2510).
- **Kemandirian Prasyarat:** Pada `v2/appointment` (Tabel 5-296, baris 19812–19866) dan `v1/registerment` (Tabel 5-292, baris 19240–19291), `receptionistId` (ID karyawan yang dikunjungi) dan `accessInfo.accessLevelList` sama-sama bertanda **`Opt.`**. Field wajib (`Req.`) hanya waktu kunjungan ISO 8601, jenis keperluan (`visitReasonType` / `visitPurposeType`), `visitorFamilyName`, `visitorGivenName`, dan `gender`. Bila `visitorGroupName` diisi nama baru, sistem otomatis membuatnya (baris 2439–2440, 2472).
- **Kesesuaian Next.js 16 + Tailwind CSS v4:** Seluruh pertukaran data berupa JSON + Base64 image/QR, sehingga Route Handlers / Server Actions Next.js dapat langsung merender UI resepsionis, manajemen janji temu, kartu/QR tamu, dan daftar tamu aktif tanpa komponen native OS atau streaming proxy.

### 2. Resource Management — Bab 4.2 (baris 1424–1827), Bab 5.2 (baris 3211–4951) & Bab 5.3 (baris 4952–13348)

- **Peran Arsitektural:** Merupakan lapisan fondasi master data (`encodeDevice`, `acsDevice`, `site`, `regions`, `cameras`, `acsDoor`, `org`, `person`, `vehicle`, `frs/face`, `alarmInputs/Outputs`) yang menyediakan `indexCode` untuk dipakai modul bisnis lain (Bab 4.2.1, baris 1429–1432).
- **Mengapa bukan modul bisnis utama tunggal, tetapi wajib dipakai sebagai helper:**
  - Totalnya terlalu besar (99 entri endpoint di Bab 5.2–5.3) dan sebagian besar hanya operasi sinkronisasi/pencarian tabel.
  - Panduan menyarankan menarik daftar resource secara berkala (`pageSize` maks. 500) dan menyimpannya di platform pihak ketiga daripada melakukan polling terus-menerus (Bab 4.2.3, baris 1818–1821).
  - Sangat ideal diambil **secara selektif (2–4 endpoint)** sebagai pendukung modul bisnis pertama (misalnya `person/advance/personList` untuk memilih host pada Visitor Management, atau `regions` + `cameras` jika membangun direktori kamera).

### 3. Access Control — Bab 4.5 (baris 2245–2378) & Bab 5.9 (baris 24283–25550)

- **Prasyarat & Kompleksitas:**
  - Bab 4.5.4 (*Before You Start*, baris 2311–2316) mewajibkan access level sudah dikonfigurasi di platform dan **Person** sudah ditambahkan sebelumnya.
  - Pengelolaan hak akses (`privilege/group`, `privilege/group/add`, `single/addPersons`) membutuhkan distribusi asinkron ke controller fisik, sehingga harus dicek ulang lewat `POST /artemis/api/acs/v1/auth/applicationResult` dan di-retry lewat `POST /artemis/api/visitor/v1/auth/reapplication` bila gagal (baris 2333–2336, 2371–2378).
  - Kontrol pintu (`POST /artemis/api/acs/v1/door/doControl`, Bab 5.9.1, maks. 10 `doorIndexCodes` per panggilan) dan pencarian log tap (`POST /artemis/api/acs/v1/door/events`, Bab 5.9.2) membutuhkan `doorIndexCodes` dari `acsDoorList` serta perangkat pintu fisik untuk verifikasi E2E yang nyata.
- **Kesimpulan:** Lebih tepat menjadi **fase kedua** setelah Visitor Management (yang juga sudah bersentuhan dengan `acs/v1/privilege/group` `type=2` dan `visitor/v1/auth/reapplication`).

### 4. Video Application — Bab 4.4 (baris 1963–2244) & Bab 5.4 (baris 13349–17342)

- **Ketergantungan & Kendala Infrastruktur Browser:**
  - OpenAPI `previewURLs` (`v1`/`v2`, Bab 5.4.12–5.4.13, baris 15230–15425) dan `playbackURLs` (Bab 5.4.11, baris 15009–15110) hanya mengembalikan URL + token `authentication` — **OpenAPI tidak menyediakan player** (Bab 4.4.4, baris 2003–2006).
  - Ketiga jalur SDK resmi yang dibahas di Bab 4.4.4 (`C++/C# SDK`, `VideoWebPlugin` / `HCVideoSDKWebControl.exe`, dan non-plugin `JsDecoder` via WebSocket) secara eksplisit dinyatakan **hanya mendukung sistem operasi Windows** (baris 2024–2029, 2069–2095; `VideoWebPlugin` bahkan tidak mendukung `iframe`/pop-up, baris 2090–2091).
  - Jalur standar open-source (`HLS`, `HLS_S`, `RTMP`) memiliki batasan ketat: hanya mendukung video **H.264** (tidak mendukung H.265 tanpa transcoding), audio **AAC**, dan untuk playback HLS hanya mendukung Cloud Storage ≥ 2.2.8 / CVR ≥ 3.2.8 (bukan 5.x) (Bab 5.4.11–5.4.12, baris 15023–15029, 15235–15240).
  - Browser juga harus mampu menjangkau langsung Stream Media Server (`SMS`) atau memerlukan backend relay/transcoding RTSP->HLS/WebRTC, ditambah batasan `download` maks. 1 menit dan transcoding MP4 yang lambat (Bab 4.4.5, baris 2234–2237).
- **Alternatif Ringan jika Fokus Video:** Hanya endpoint snapshot `POST /artemis/api/video/v1/camera/capture` (Bab 5.4.24, baris 16080–16125) yang mengembalikan Base64 JPEG via REST murni tanpa media player.

### 5. Event and Alarm — Bab 4.3 (baris 1828–1962) & Bab 5.5 (baris 17343–18366)

- **Kendala Arsitektur Awal:**
  - Untuk *real-time push*, Next.js harus menyediakan endpoint publik/internal (`eventDest` HTTP/HTTPS, Bab 5.5.3, baris 17710–17717) yang **bisa dihubungi oleh server HikCentral**, mengembalikan HTTP `200` secara cepat, dan memproses payload di thread/worker terpisah (Bab 4.3.2–4.3.3, baris 1853–1854, 1959–1962). Jika Next.js berjalan lokal di laptop dev di balik NAT/firewall, verifikasi webhook terhambat.
  - Pencarian record (`POST /artemis/api/eventService/v1/eventRecords/page`, Bab 5.5.2, baris 17417) mensyaratkan pengguna sudah berlangganan dan menerima event sebelumnya (Bab 4.3.2, baris 1894–1895) serta sudah memiliki daftar `srcIndexs` dari Resource Management.
- **Kesimpulan:** Lebih cocok dibangun sebagai **cross-cutting layer** setelah modul bisnis inti (Visitor / Access Control / Camera) berjalan.

---

## Paket Implementasi Disarankan (Setelah Tiket `01`–`03` Selesai)

Jika Product Owner mengonfirmasi proyek `vms` berfokus pada **Visitor Management System**, berikut scope MVP paling ramping yang disarankan:
1. **Master Lookup Tipis (Opsional):** `POST /artemis/api/resource/v1/person/advance/personList` (pilih host) & `POST /artemis/api/acs/v1/privilege/group` (`type: 2`, pilih access level tamu).
2. **Alur Reservasi & Approval:** `v2/appointment`, `v1/appointment/appointmentlist`, `v1/appointment/single/delete`, `v1/visitorConfig/automaticApproval`.
3. **Alur Front-Desk Check-in / Check-out:** `v1/registerment`, `v1/register/getVistorRegisterRecord`, `v1/visitor/out`, `v1/appointment/getVisitorStatus`.
4. **Kredensial Tamu:** `v1/visitor/qr/get` dan `v1/pincode/get`.

Jika Product Owner ternyata menginginkan **Video Management System**, mulai dengan **Camera Directory + Live Snapshot** (`regions`, `cameras`, `camera/capture`) sebelum berinvestasi pada infrastruktur player/streaming relay.
