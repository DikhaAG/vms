import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GroupRegistrationClient } from "./group-registration-client";
import GroupRegistrationPage from "./page";
import type { Facility } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";

describe("GroupRegistration UI Localization", () => {
  const dummyFacilities: Facility[] = [
    {
      id: "fac-jakarta",
      name: "Kantor Pusat Jakarta",
      timezone: "Asia/Jakarta",
      address: "Jl. Jenderal Sudirman No. 1, Jakarta",
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

  it("renders localized form sections, labels, and action buttons in Indonesian", () => {
    const html = renderToStaticMarkup(
      <GroupRegistrationClient
        facilities={dummyFacilities}
        allAccessLevels={dummyAccessLevels}
      />,
    );

    expect(html).toContain("1. Data Rombongan &amp; Jadwal Kunjungan");
    expect(html).toContain("2. Hak Akses Pintu &amp; Kuota Tap");
    expect(html).toContain("3. Anggota Rombongan (2 Tamu)");
    expect(html).toContain("+ Tambah Anggota Tamu");
    expect(html).toContain("Unggah CSV Rombongan");
    expect(html).toContain("Anggota Tamu #1");
    expect(html).toContain("Anggota Tamu #2");
    expect(html).toContain("Konfirmasi &amp; Daftarkan Kunjungan Rombongan (2 Tamu)");
  });

  it("renders page header with PageGuideModal for groupRegistration", async () => {
    const pageComponent = await GroupRegistrationPage();
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Pendaftaran Rombongan Tamu");
    expect(html).toContain("Kunjungan Kolektif");
    expect(html).toContain("Panduan Halaman Ini");
    expect(html).toContain("aria-haspopup=\"dialog\"");
  });
});
