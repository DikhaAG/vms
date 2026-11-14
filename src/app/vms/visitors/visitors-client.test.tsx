import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitorsClient } from "./visitors-client";
import VisitorsPage from "./page";
import type { VisitorProfile } from "@/lib/vms/group-contract";

describe("Visitors UI Localization", () => {
  const dummyProfiles: VisitorProfile[] = [
    {
      id: "prof-01",
      givenName: "Rian",
      familyName: "Pratama",
      fullName: "Rian Pratama",
      certificateType: 111,
      certificateNo: "3171012345670001",
      phone: "+628123456789",
      email: "rian.pratama@example.com",
      visitCount: 3,
      isDeleted: false,
      createdAtUtc: "2026-01-01T00:00:00Z",
      updatedAtUtc: "2026-01-01T00:00:00Z",
    },
    {
      id: "prof-02",
      givenName: "Siti",
      familyName: "Rahma",
      fullName: "Siti Rahma",
      certificateType: 414,
      certificateNo: "A12345678",
      phone: "+628987654321",
      visitCount: 1,
      isDeleted: true,
      deletionReason: "Permintaan pemilik data",
      createdAtUtc: "2026-01-01T00:00:00Z",
      updatedAtUtc: "2026-01-01T00:00:00Z",
    },
  ];

  it("renders localized stat cards, search bar, and table in Indonesian", () => {
    const html = renderToStaticMarkup(
      <VisitorsClient initialProfiles={dummyProfiles} />,
    );

    expect(html).toContain("Total Basis Data Tamu");
    expect(html).toContain("Profil Aktif (Siap Auto-fill)");
    expect(html).toContain("Arsip PDP / Terhapus Halus");
    expect(html).toContain("Tampilkan Arsip Terhapus (Kepatuhan PDP)");
    expect(html).toContain("Nama Tamu");
    expect(html).toContain("Tanda Pengenal (NIK/Paspor)");
    expect(html).toContain("Status Kepatuhan PDP");
    expect(html).toContain("Aktif (Tersimpan PDP)");
    expect(html).toContain("Terhapus Halus / Diarsipkan");
    expect(html).toContain("Hapus PDP");
    expect(html).toContain("Pulihkan");
  });

  it("renders page header with PageGuideModal for visitors", async () => {
    const pageComponent = await VisitorsPage();
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Buku Tamu &amp; Basis Data Biometrik");
    expect(html).toContain("Privasi &amp; Biometrik");
    expect(html).toContain("Panduan Halaman Ini");
    expect(html).toContain("aria-haspopup=\"dialog\"");
  });
});

