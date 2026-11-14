import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageGuideModal } from "./page-guide-modal";
import { idDict } from "@/lib/vms/i18n/id";

describe("PageGuideModal Component", () => {
  it("renders trigger button with accessible label and book icon by default", () => {
    const html = renderToStaticMarkup(<PageGuideModal pageKey="reception" />);
    expect(html).toContain("Panduan Halaman Ini");
    expect(html).toContain("aria-haspopup=\"dialog\"");
    // Dialog itself should not be rendered when closed
    expect(html).not.toContain("role=\"dialog\"");
  });

  it("renders dialog with 5 structured sections when initially open", () => {
    const html = renderToStaticMarkup(
      <PageGuideModal pageKey="reception" defaultOpen={true} />
    );

    // Verify accessible dialog semantics
    expect(html).toContain("role=\"dialog\"");
    expect(html).toContain("aria-modal=\"true\"");
    expect(html).toContain("aria-labelledby=");

    // Verify reception specific titles
    const receptionGuide = idDict.pages.reception.guide;
    expect(html).toContain(receptionGuide.title);
    expect(html).toContain(receptionGuide.subtitle);

    // Section 1: Penjelasan Tujuan
    expect(html).toContain("Tujuan Halaman Ini");
    expect(html).toContain(receptionGuide.purpose);

    // Section 2: Peran Penanggung Jawab
    expect(html).toContain("Peran Penanggung Jawab");
    expect(html).toContain("Petugas Resepsionis Meja Depan &amp; Satpam Pos Masuk Lobi");

    // Section 3: Langkah Operasional 1-2-3
    expect(html).toContain("Langkah Operasional");
    expect(html).toContain("Tanyakan Identitas &amp; Karyawan Tuan Rumah");
    expect(html).toContain(receptionGuide.steps[0].description);
    expect(html).toContain(receptionGuide.steps[1].title);
    expect(html).toContain("Pilih Hak Akses Pintu &amp; Proses Masuk");

    // Section 4: Arti Warna Status & Simbol
    expect(html).toContain("Arti Warna Status &amp; Simbol");
    expect(html).toContain(receptionGuide.badgeMeanings[0].label);

    // Section 5: Solusi Masalah Umum (FAQ)
    expect(html).toContain("Solusi Masalah Umum (FAQ)");
    expect(html).toContain(receptionGuide.faqs[0].question);
    expect(html).toContain(receptionGuide.faqs[0].answer);

    // Verify accessible close button
    expect(html).toContain("aria-label=\"Tutup panduan\"");
  });

  it("correctly renders content for activeMonitoring pageKey", () => {
    const html = renderToStaticMarkup(
      <PageGuideModal pageKey="activeMonitoring" defaultOpen={true} />
    );
    const activeGuide = idDict.pages.activeMonitoring.guide;
    expect(html).toContain("Panduan Monitoring Kehadiran &amp; Pintu");
    expect(html).toContain(activeGuide.purpose);
    expect(html).toContain("Petugas Keamanan Gedung (Security Control Room) &amp; Supervisor Resepsionis");
    expect(html).toContain(activeGuide.steps[0].title);
  });

  it("allows custom trigger button label or styling if provided", () => {
    const html = renderToStaticMarkup(
      <PageGuideModal
        pageKey="approvals"
        triggerLabel="Bantuan Alur Persetujuan"
        className="custom-trigger-class"
      />
    );
    expect(html).toContain("Bantuan Alur Persetujuan");
    expect(html).toContain("custom-trigger-class");
  });
});
