import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { VisitorsClient } from "./visitors-client";
import { SoftDeleteModal } from "./soft-delete-modal";
import { VisitorDetailsModal } from "./visitor-details-modal";
import VisitorsPage from "./page";
import type { VisitorProfile } from "@/lib/vms/group-contract";
import { renderWithVmsProviders } from "@/test/test-utils";

describe("Visitors UI Localization & Canonical Component Migration", () => {
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
      email: "siti.rahma@example.com",
      visitCount: 1,
      isDeleted: true,
      deletionReason: "Permintaan pemilik data",
      createdAtUtc: "2026-01-01T00:00:00Z",
      updatedAtUtc: "2026-01-01T00:00:00Z",
    },
    {
      id: "prof-03",
      givenName: "Bambang",
      familyName: "Wijaya",
      fullName: "Bambang Wijaya",
      certificateType: 111,
      certificateNo: "3171099999990003",
      phone: "+628111222333",
      email: "bambang.wijaya@example.com",
      visitCount: 8,
      isDeleted: false,
      createdAtUtc: "2026-01-02T00:00:00Z",
      updatedAtUtc: "2026-01-02T00:00:00Z",
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

  it("adopts canonical UiKpiGrid and UiKpiCard primitives with tabular counters and LED indicators", () => {
    const html = renderToStaticMarkup(
      <VisitorsClient initialProfiles={dummyProfiles} />,
    );

    // UiKpiCard container and tabular numbers
    expect(html).toContain("tabular-nums");
    expect(html).toContain("font-mono");
    expect(html).toContain("ks-led-patina");
    expect(html).toContain("ks-led-amber");
    expect(html).toContain("role=\"status\"");
  });

  it("adopts canonical UiFilterToolbar primitive with Kinpaku design tokens", () => {
    const html = renderToStaticMarkup(
      <VisitorsClient initialProfiles={dummyProfiles} />,
    );

    expect(html).toContain("bg-[var(--ks-paper-raised)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("type=\"search\"");
    expect(html).toContain("type=\"checkbox\"");
    expect(html).toContain("Tampilkan Arsip Terhapus (Kepatuhan PDP)");
  });

  it("adopts UiCard and Kinpaku table border rules with tactile UiButton actions", () => {
    const html = renderToStaticMarkup(
      <VisitorsClient initialProfiles={dummyProfiles} />,
    );

    // UiCard container and hairline rules
    expect(html).toContain("border-[var(--ks-rule)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");

    // Tactile UiButton actions
    expect(html).toContain("ks-btn");
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("Pulihkan");
    expect(html).toContain("Hapus PDP");
  });

  it("renders polite empty state when initialProfiles is empty", () => {
    const html = renderToStaticMarkup(<VisitorsClient initialProfiles={[]} />);
    expect(html).toContain("Buku Tamu Masih Kosong");
    expect(html).toContain(
      "Data profil dan riwayat kunjungan tamu akan otomatis tercatat di sini setelah pendaftaran diproses.",
    );
  });

  it("renders page header with PageGuideModal for visitors", async () => {
    const pageComponent = await VisitorsPage();
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Buku Tamu &amp; Basis Data Biometrik");
    expect(html).toContain("Privasi &amp; Biometrik");
    expect(html).toContain("Panduan Halaman Ini");
    expect(html).toContain("aria-haspopup=\"dialog\"");
  });

  describe("TanStack Table Migration & nuqs URL State Synchronization", () => {
    it("filters visitors table matching search query from URL search params (?q=...)", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter searchParams={{ q: "Rian" }}>
          <VisitorsClient initialProfiles={dummyProfiles} />
        </NuqsTestingAdapter>,
      );

      // Only Rian Pratama should match
      expect(html).toContain("Rian Pratama");
      expect(html).not.toContain("Siti Rahma");
      expect(html).not.toContain("Bambang Wijaya");
    });

    it("filters visitors table matching certificate number from URL search params", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter searchParams={{ q: "A12345678" }}>
          <VisitorsClient initialProfiles={dummyProfiles} />
        </NuqsTestingAdapter>,
      );

      // Only Siti Rahma with passport A12345678 should match
      expect(html).toContain("Siti Rahma");
      expect(html).not.toContain("Rian Pratama");
      expect(html).not.toContain("Bambang Wijaya");
    });

    it("sorts visitor records based on sort column and order from URL search params", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter
          searchParams={{ sort: "visitCount", order: "desc" }}
        >
          <VisitorsClient initialProfiles={dummyProfiles} />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain('aria-sort="descending"');
      // Bambang Wijaya (8 visits) should appear before Rian Pratama (3 visits) and Siti Rahma (1 visit)
      const bambangIdx = html.indexOf("Bambang Wijaya");
      const rianIdx = html.indexOf("Rian Pratama");
      const sitiIdx = html.indexOf("Siti Rahma");

      expect(bambangIdx).toBeGreaterThan(-1);
      expect(rianIdx).toBeGreaterThan(bambangIdx);
      expect(sitiIdx).toBeGreaterThan(rianIdx);
    });

    it("sorts visitor records by registration date (createdAtUtc)", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter
          searchParams={{ sort: "createdAtUtc", order: "desc" }}
        >
          <VisitorsClient initialProfiles={dummyProfiles} />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain("Tanggal Registrasi");
      expect(html).toContain('aria-sort="descending"');
      // Bambang registered on 2026-01-02, Rian on 2026-01-01
      const bambangIdx = html.indexOf("Bambang Wijaya");
      const rianIdx = html.indexOf("Rian Pratama");
      expect(bambangIdx).toBeLessThan(rianIdx);
    });

    it("renders empty state with reset button when search query has zero matches", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter searchParams={{ q: "ZzzUnknown" }}>
          <VisitorsClient initialProfiles={dummyProfiles} />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain("Tidak ada profil tamu yang cocok dengan");
      expect(html).toContain("ZzzUnknown");
      expect(html).toContain("Periksa ejaan kata kunci atau hapus pencarian");
      expect(html).toContain("Reset Pencarian");
    });

    it("renders pagination controls and tabular page counters in table footer", () => {
      const html = renderToStaticMarkup(
        <NuqsTestingAdapter searchParams={{ page: "1", pageSize: "2" }}>
          <VisitorsClient initialProfiles={dummyProfiles} />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain("Halaman");
      expect(html).toContain("dari");
      expect(html).toContain("Sebelumnya");
      expect(html).toContain("Selanjutnya");
    });
  });

  describe("Modal Workflows: Soft-Delete & Inspection Dialogs", () => {
    it("renders SoftDeleteModal with UU PDP compliance warning and confirmation action", () => {
      const html = renderToStaticMarkup(
        <SoftDeleteModal
          isOpen={true}
          profile={dummyProfiles[0]}
          onClose={() => {}}
          onConfirm={() => {}}
        />,
      );

      expect(html).toContain("Arsipkan Profil Tamu (Kepatuhan PDP)");
      expect(html).toContain("Rian Pratama");
      expect(html).toContain("3171012345670001");
      expect(html).toContain("UU PDP");
      expect(html).toContain("Konfirmasi Hapus PDP");
      expect(html).toContain("Batal");
    });

    it("renders VisitorDetailsModal with full identity, biometrics, and audit history", () => {
      const html = renderToStaticMarkup(
        <VisitorDetailsModal
          isOpen={true}
          profile={dummyProfiles[0]}
          onClose={() => {}}
        />,
      );

      expect(html).toContain("Rincian &amp; Arsip Profil Tamu");
      expect(html).toContain("Rian Pratama");
      expect(html).toContain("prof-01");
      expect(html).toContain("3171012345670001");
      expect(html).toContain("+628123456789");
      expect(html).toContain("rian.pratama@example.com");
      expect(html).toContain("3 kali");
      expect(html).toContain("Profil Aktif Terdaftar");
      expect(html).toContain("Hapus PDP (Soft-Delete)");
    });

    it("renders archived status badge and deletion reason in VisitorDetailsModal for deleted visitor", () => {
      const html = renderToStaticMarkup(
        <VisitorDetailsModal
          isOpen={true}
          profile={dummyProfiles[1]}
          onClose={() => {}}
        />,
      );

      expect(html).toContain("Siti Rahma");
      expect(html).toContain("Arsip Terhapus Halus");
      expect(html).toContain("Permintaan pemilik data");
      expect(html).toContain("Pulihkan Status Aktif");
    });
  });

  describe("Integrated VmsProviders Rendering", () => {
    it("renders successfully within isolated VMS test providers harness", () => {
      const { html } = renderWithVmsProviders(
        <VisitorsClient initialProfiles={dummyProfiles} />,
      );

      expect(html).toContain("Total Basis Data Tamu");
      expect(html).toContain("Rian Pratama");
      expect(html).toContain("Siti Rahma");
      expect(html).toContain("Bambang Wijaya");
    });
  });
});
