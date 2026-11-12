# Prototipe UI Tes Koneksi ke Endpoint Version

Type: prototype
Status: resolved
Blocked by: 01, 02

## Question

Apakah client HTTP dan signature `HmacSHA256` kita sudah berjalan benar secara end-to-end saat memanggil `POST /artemis/api/common/v1/version` dari UI Next.js 16 + Tailwind CSS v4?

## Context & References

- **Referensi:** [Bab 5.1.1 POST /artemis/api/common/v1/version](../../../docs/reference/HikCentral%20Professional%20OpenAPI%20V3.1.1_Developer%20Guide_V3.1.1_20260723.md#L3110-L3148)
- **Detail endpoint `version`:**
  - Request header wajib: `userId` (1–32 karakter, tanpa karakter spesial `' / \ : * ? " < > |`).
  - Respons sukses (`code: "0"`): `data.produceName` dan `data.softVersion`.
- **Target stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4.
- **Aturan `/prototype`:** UI sederhana/throwaway untuk validasi koneksi dan autentikasi end-to-end (panggilan tetap melewati Route Handler / Server Action agar `AppSecret` tidak terekspos ke browser).

## Acceptance Criteria

- Terdapat halaman UI sederhana yang memicu pemanggilan server-side ke `POST /artemis/api/common/v1/version`.
- Menampilkan status koneksi, latensi, serta `produceName` dan `softVersion` jika sukses, atau `code` dan `msg` error jika gagal (tanpa membocorkan `AppSecret`).
- Dapat diuji terhadap server HikCentral nyata (atau konfigurasi stub/mock bila server belum tersedia di sesi dev).

## Answer

Prototipe end-to-end tes koneksi ke `POST /artemis/api/common/v1/version` (Bab 5.1.1) telah selesai dan terverifikasi (`pnpm test` 25/25 lulus across 4 test file, `pnpm typecheck` & `pnpm build` lulus):

- **Shared Contract & Validator ([`src/lib/hikcentral/version-contract.ts`](../../src/lib/hikcentral/version-contract.ts)):** Menyimpan tipe kontrak (`VersionCheckMode`, `StubScenario`, `VersionCheckResult`, `VersionCheckError`, `HikCentralVersionData`), type guard (`isVersionCheckMode`, `isStubScenario`, `isHikCentralVersionData`), dan fungsi tunggal `validateUserId` (1–32 karakter tanpa `' / \ : * ? " < > |`) agar aman di-import Client Component tanpa menarik modul Node.js (`node:https`, `node:crypto`).
- **Server Version Use-Case ([`src/lib/hikcentral/version.ts`](../../src/lib/hikcentral/version.ts)):** `checkHikCentralVersion` memvalidasi `userId`, menjalankan mode `live` via `createHikCentralClient(loadHikCentralConfigFromEnv())` atau mode `stub` (`success`, `auth-error`, `network-error`), memvalidasi `produceName` & `softVersion` pada respons `code: "0"`, mengukur `latencyMs`, dan memetakan error ke `{ kind, status?, code?, message }` tanpa membocorkan `AppSecret`.
- **Route Handler ([`src/app/api/hikcentral/version/route.ts`](../../src/app/api/hikcentral/version/route.ts)):** `POST /api/hikcentral/version` (`force-dynamic`) mem-parse JSON secara aman dan memetakan hasil ke status HTTP (`200` sukses, `400` validation, `500` config, `502` upstream/network/parse).
- **UI Prototipe & Navigasi ([`src/app/prototype/version-check/page.tsx`](../../src/app/prototype/version-check/page.tsx), [`src/app/prototype/version-check/version-check-form.tsx`](../../src/app/prototype/version-check/version-check-form.tsx), [`src/app/page.tsx`](../../src/app/page.tsx)):** Form Tailwind CSS v4 dengan input `userId`, radio selector mode (`stub`/`live`) serta skenario stub, panel hasil status + latensi + `produceName`/`softVersion` atau `kind`/`code`/`message`, dan link dari halaman utama.


