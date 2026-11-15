import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitorsClient } from "./visitors-client";
import VisitorsPage from "./page";
import type { VisitorProfile } from "@/lib/vms/group-contract";

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
});
