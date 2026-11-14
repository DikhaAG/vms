import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PreRegistrationForm } from "./pre-registration-form";
import PreRegistrationPage from "./page";
import type { Facility } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";

describe("PreRegistration UI Localization", () => {
  const dummyFacilities: Facility[] = [
    {
      id: "fac-jakarta",
      name: "Kantor Pusat Jakarta",
      timezone: "Asia/Jakarta",
      address: "Jl. Jenderal Sudirman No. 1, Jakarta",
    },
    {
      id: "fac-surabaya",
      name: "Cabang Surabaya",
      timezone: "Asia/Jakarta",
      address: "Jl. Pemuda No. 45, Surabaya",
    },
  ];

  const dummyAccessLevels: AccessLevel[] = [
    {
      id: "al-lobby",
      facilityId: "fac-jakarta",
      name: "Pintu Masuk Lobi Utama",
      description: "Akses gerbang lobi dan pintu putar lantai 1",
      doors: ["Lobby SpeedGate A"],
      floors: ["1F"],
      timeScheduleId: 2,
      isDefault: true,
      createdAtUtc: "2026-01-01T00:00:00Z",
      updatedAtUtc: "2026-01-01T00:00:00Z",
    },
  ];

  it("renders localized form legends and action buttons in Indonesian", () => {
    const html = renderToStaticMarkup(
      <PreRegistrationForm
        initialFacilities={dummyFacilities}
        initialAccessLevels={dummyAccessLevels}
      />,
    );

    // Section Legends
    expect(html).toContain("1. Pilih Gedung &amp; Zona Waktu Fasilitas");
    expect(html).toContain("2. Data Identitas Tamu");
    expect(html).toContain("3. Pengambilan &amp; Verifikasi Foto Biometrik Wajah");
    expect(html).toContain("4. Jadwal Kunjungan &amp; Keperluan");
    expect(html).toContain("5. Karyawan Tuan Rumah Internal");
    expect(html).toContain("6. Kelompok Hak Akses Pintu &amp; Batas Tap");

    // Action buttons
    expect(html).toContain("Buat Tautan Pendaftaran Mandiri");
    expect(html).toContain("Kirim Janji Temu Tamu");
    expect(html).toContain("Unggah Berkas Foto");
    expect(html).toContain("Batas Buka Pintu / Kuota Tap Pintu Putar");
  });

  it("renders page header with PageGuideModal for preRegistration", async () => {
    const pageComponent = await PreRegistrationPage();
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Buat Undangan Tamu Terjadwal");
    expect(html).toContain("Kunjungan Individual");
    expect(html).toContain("Panduan Halaman Ini");
    expect(html).toContain("aria-haspopup=\"dialog\"");
  });
});
