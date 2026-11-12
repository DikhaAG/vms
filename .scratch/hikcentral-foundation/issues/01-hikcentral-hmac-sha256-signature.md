# Implementasi Utilitas HTTP Signature HmacSHA256

Type: task
Status: resolved
Blocked by: None

## Question

Bagaimana merancang dan mengimplementasikan fungsi utilitas TypeScript murni untuk membangun *Signature String* kanonis dan menghitung `X-Ca-Signature` (`HmacSHA256` + `Base64`) sesuai spesifikasi Bab 3.2 HikCentral OpenAPI V3.1.1?

## Context & References

- **Referensi:** [HikCentral Developer Guide — Bab 3.2 Signature and Authentication](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md#L1278-L1406)
- **Aturan inti dari Bab 3.2:**
  - Susunan *Signature String*: `HTTP METHOD` (uppercase) + `\n` + `Accept` (jika ada) + `Content-MD5` (Base64 dari MD5 body UTF-8, jika ada) + `Content-Type` (jika ada) + `Date` (jika ada) + `Headers` (`lowercase-name:trimmed-value\n`, urut alfabetis) + `Uri` (absolute path + query string).
  - Header yang dikecualikan dari blok `Headers` signature: `X-Ca-Signature`, `X-Ca-Signature-Headers`, `Accept`, `Content-MD5`, `Content-Type`, `Date`, `Content-Length`, `Server`, `Connection`, `Host`, `Transfer-Encoding`, `X-Application-Context`, `Content-Encoding`.
  - Menghasilkan `X-Ca-Signature-Headers` (daftar nama header bertanda tangan dalam huruf kecil, urut alfabetis, dipisah koma) dan `X-Ca-Signature` (`Base64(HmacSHA256(stringToSign, appSecret))`, encoding UTF-8).
- **Catatan repo:** Saat tiket ini dibuat, `package.json` dan setup TypeScript/test runner belum tersedia di repo.

## Acceptance Criteria

- Fungsi utilitas dapat membangun *Signature String* dan menghasilkan `X-Ca-Signature` serta `X-Ca-Signature-Headers` secara deterministik.
- Teruji dengan unit test terhadap contoh vektor autentikasi di Bab 3.2 (dan kasus variasi header/body/query string).
- Tidak bergantung pada secret hardcoded; menerima `appKey` dan `appSecret` secara eksplisit.

## Answer

Utilitas signing HikCentral OpenAPI V3.1.1 (Bab 3.2) telah diimplementasikan melalui fungsi `signHikCentralRequest` di [`src/lib/hikcentral/signature.ts`](../../../src/lib/hikcentral/signature.ts) dan diverifikasi dengan 6 unit test di [`src/lib/hikcentral/signature.test.ts`](../../../src/lib/hikcentral/signature.test.ts):

- Membangun *Signature String* kanonis (`METHOD`, baris opsional `Accept` / `Content-MD5` / `Content-Type` / `Date` tanpa newline bila absen, header ter-lowercase & trimmed urut code point, serta URI + query terurut dengan bare flags tetap utuh dan fragment `#...` terhapus).
- Menghitung `Content-MD5` (`Base64(MD5(body))` UTF-8) secara otomatis untuk payload non-empty bila header `Content-MD5` belum disediakan, mengecualikan seluruh 13 header non-signature Bab 3.2, serta menghasilkan `X-Ca-Key`, `X-Ca-Timestamp`, `X-Ca-Nonce` (opsional), `X-Ca-Signature-Headers`, dan `X-Ca-Signature` (`Base64(HmacSHA256(stringToSign, appSecret))`).
- Validasi `/code-review` (Standards + Spec) selesai; temuan minor (`computeContentMd5IfAbsent`, trimming `appKey`, fallback `timestamp` kosong, stripping `#fragment`) sudah diperbaiki dan `pnpm test` (6/6) + `pnpm typecheck` lulus setelah edit terakhir.

