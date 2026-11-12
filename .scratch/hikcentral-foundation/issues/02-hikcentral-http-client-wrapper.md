# Pembuatan Wrapper HTTP Client Standar HikCentral

Type: task
Status: resolved
Blocked by: 01

## Question

Bagaimana bentuk wrapper HTTP Client server-side (TypeScript) untuk mengeksekusi request `POST` ke URI `/artemis/api/...` lengkap dengan header autentikasi (`X-Ca-Key`, `X-Ca-Signature`, `X-Ca-Signature-Headers`, dll.), konfigurasi server/TLS, serta parsing envelope respons standar HikCentral?

## Context & References

- **Referensi:**
  - [Bab 3.1 Request and Response Rule](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md#L1152-L1277)
  - [Bab 3.2 Signature and Authentication](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md#L1278-L1406)
  - [Bab 2.2.1 Authenticate Service Certificate](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md#L84)
- **Aturan inti:**
  - Semua API menggunakan `POST` HTTPS ke `<protocol>://<serverAddress>[:serverPort]/artemis/api/...` dengan payload JSON UTF-8.
  - Header wajib mencakup `X-Ca-Key`, `X-Ca-Signature`, `X-Ca-Signature-Headers`, serta header standar seperti `Accept` dan `Content-Type` (plus opsional `X-Ca-Timestamp`, `X-Ca-Nonce`, `Content-MD5`, dan header khusus endpoint seperti `userId`).
  - Envelope respons standar: `{ code: string, msg: string, data: T }`, di mana `"0"` berarti sukses dan kode lain berarti gagal.
  - Harus berjalan strictly di sisi server (AppKey/AppSecret tidak boleh bocor ke bundle client Next.js).
  - Perlu menangani kasus sertifikat HTTPS on-prem/self-signed secara aman dan terkonfigurasi.

## Acceptance Criteria

- Wrapper menyediakan fungsi typed `post<TResponse, TBody>(path, body?, options?)` untuk memanggil `/artemis/api/...`.
- Otomatis menandatangani request menggunakan utilitas dari tiket [Implementasi Utilitas HTTP Signature HmacSHA256](01-hikcentral-hmac-sha256-signature.md).
- Memetakan error jaringan, HTTP non-2xx, dan error bisnis (`code !== "0"`) ke struktur error yang jelas.
- Konfigurasi diambil dari environment variables server-side (`HIKCENTRAL_BASE_URL`, `HIKCENTRAL_APP_KEY`, `HIKCENTRAL_APP_SECRET`, dll.).

## Answer

Wrapper HTTP Client server-side telah diimplementasikan di [`src/lib/hikcentral/client.ts`](../../../src/lib/hikcentral/client.ts) (beserta placeholder env di [`.env.example`](../../../.env.example) dan 10 unit test di [`src/lib/hikcentral/client.test.ts`](../../../src/lib/hikcentral/client.test.ts)):

- `createHikCentralClient(config, transport?)` menyediakan `post<TResponse, TBody>(path, body?, options?)` khusus `https:` ke endpoint `/artemis/api/...` dengan `node:https` default transport (mendukung `timeoutMs` serta opsi sertifikat self-signed/on-prem `tls.rejectUnauthorized` dan `tls.ca`).
- Menandatangani request melalui `signHikCentralRequest` ([`src/lib/hikcentral/signature.ts`](../../../src/lib/hikcentral/signature.ts)), melakukan deduplikasi header secara case-insensitive agar header wire persis cocok dengan header bertanda tangan, serta menjamin server-only guard (`typeof window !== "undefined"`).
- Memetakan kegagalan ke `HikCentralError` (`kind`: `"config" | "network" | "http" | "parse" | "api"`) dengan redaksi `appSecret` di pesan maupun `cause`.
- `loadHikCentralConfigFromEnv(env?)` membaca `HIKCENTRAL_BASE_URL`, `HIKCENTRAL_APP_KEY`, `HIKCENTRAL_APP_SECRET`, `HIKCENTRAL_USER_ID`, `HIKCENTRAL_TIMEOUT_MS`, `HIKCENTRAL_TLS_INSECURE`, dan `HIKCENTRAL_CA_CERT`.
- Setelah perbaikan pasca-`/code-review`, `pnpm test` (2 files, 16/16 tests) dan `pnpm typecheck` lulus.

