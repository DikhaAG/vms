import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  UiButton,
  UI_BUTTON_VARIANTS,
  UI_BUTTON_SIZES,
  UiCard,
  UiCardHeader,
  UiCardContent,
  UiKpiCard,
  UiKpiGrid,
  KPI_STATUS_COLORS,
  UiFilterToolbar,
  UiBadge,
  UI_BADGE_VARIANTS,
  UiModal,
  UI_MODAL_SIZES,
  PageHeader,
  UiDataTable,
  useTableUrlState,
} from "./index";
import { idDict } from "@/lib/vms/i18n/id";

describe("UiButton Primitive", () => {
  it("renders with default primary variant, medium size, and tactile elevation", () => {
    const html = renderToStaticMarkup(<UiButton>Simpan Data</UiButton>);
    expect(html).toContain("Simpan Data");
    expect(html).toContain("ks-btn");
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("bg-[var(--ks-ink)]");
    expect(html).toContain("type=\"button\"");
  });

  it("renders secondary variant with subtle rule and paper background", () => {
    const html = renderToStaticMarkup(
      <UiButton variant="secondary">Batal</UiButton>
    );
    expect(html).toContain("Batal");
    expect(html).toContain("bg-[var(--ks-paper-raised)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
  });

  it("renders danger variant with vermilion styling", () => {
    const html = renderToStaticMarkup(
      <UiButton variant="danger">Hapus Akses</UiButton>
    );
    expect(html).toContain("Hapus Akses");
    expect(html).toContain("bg-[var(--ks-vermilion)]");
    expect(html).toContain("text-white");
  });

  it("renders ghost variant with transparent background and shadow-none", () => {
    const html = renderToStaticMarkup(
      <UiButton variant="ghost">Bantuan</UiButton>
    );
    expect(html).toContain("Bantuan");
    expect(html).toContain("bg-transparent");
    expect(html).toContain("shadow-none");
    expect(html).toContain("hover:shadow-none");
    expect(html).toContain("active:shadow-none");
  });

  it("exports canonical button variants and sizes", () => {
    expect(UI_BUTTON_VARIANTS).toEqual([
      "primary",
      "secondary",
      "danger",
      "ghost",
    ]);
    expect(UI_BUTTON_SIZES).toEqual(["sm", "md", "lg"]);
  });

  it("renders small and large sizes correctly", () => {
    const smHtml = renderToStaticMarkup(<UiButton size="sm">Kecil</UiButton>);
    expect(smHtml).toContain("px-2.5");
    expect(smHtml).toContain("text-xs");

    const lgHtml = renderToStaticMarkup(<UiButton size="lg">Besar</UiButton>);
    expect(lgHtml).toContain("px-4");
    expect(lgHtml).toContain("text-sm");
  });

  it("supports disabled state and custom classNames", () => {
    const html = renderToStaticMarkup(
      <UiButton disabled className="custom-btn-class">
        Terkunci
      </UiButton>
    );
    expect(html).toContain("disabled");
    expect(html).toContain("custom-btn-class");
    expect(html).toContain("cursor-not-allowed");
  });
});

describe("UiCard, UiCardHeader, UiCardContent Primitives", () => {
  it("renders UiCard with paper-raised background and hairline rule border", () => {
    const html = renderToStaticMarkup(
      <UiCard>
        <p>Konten Kartu</p>
      </UiCard>
    );
    expect(html).toContain("bg-[var(--ks-paper-raised)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("Konten Kartu");
  });

  it("renders UiCardHeader with title, subtitle, and bottom border", () => {
    const html = renderToStaticMarkup(
      <UiCardHeader
        title="Daftar Pengunjung"
        description="Ringkasan riwayat tamu hari ini"
        action={<button>Ekspor</button>}
      />
    );
    expect(html).toContain("Daftar Pengunjung");
    expect(html).toContain("Ringkasan riwayat tamu hari ini");
    expect(html).toContain("Ekspor");
    expect(html).toContain("border-b");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
  });

  it("renders UiCardContent with standard padding", () => {
    const html = renderToStaticMarkup(
      <UiCardContent>
        <div>Isi Detail</div>
      </UiCardContent>
    );
    expect(html).toContain("p-4");
    expect(html).toContain("sm:p-5");
    expect(html).toContain("Isi Detail");
  });
});

describe("UiKpiCard & UiKpiGrid Primitives", () => {
  it("renders UiKpiGrid container", () => {
    const html = renderToStaticMarkup(
      <UiKpiGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </UiKpiGrid>
    );
    expect(html).toContain("grid");
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("sm:grid-cols-4");
  });

  it("renders static UiKpiCard with eyebrow, tabular counter, and description", () => {
    const html = renderToStaticMarkup(
      <UiKpiCard
        label="Total Tamu di Gedung"
        value={42}
        description="Tamu aktif di dalam"
        indicator="patina"
      />
    );
    expect(html).toContain("Total Tamu di Gedung");
    expect(html).toContain("42");
    expect(html).toContain("font-mono");
    expect(html).toContain("tabular-nums");
    expect(html).toContain("Tamu aktif di dalam");
    expect(html).toContain("ks-led-patina");
    // When no onClick, it renders a container (div)
    expect(html).toContain("role=\"status\"");
  });

  it("renders interactive UiKpiCard with selection state when onClick is supplied", () => {
    const htmlSelected = renderToStaticMarkup(
      <UiKpiCard
        label="Peringatan Overstay"
        value={3}
        description="Melewati batas toleransi"
        indicator="vermilion"
        variant="overstay"
        isSelected={true}
        onClick={() => {}}
      />
    );
    expect(htmlSelected).toContain("<button");
    expect(htmlSelected).toContain("aria-pressed=\"true\"");
    expect(htmlSelected).toContain("bg-[var(--ks-vermilion)]");
    expect(htmlSelected).toContain("ks-led-vermilion");

    const htmlUnselected = renderToStaticMarkup(
      <UiKpiCard
        label="Peringatan Overstay"
        value={3}
        description="Melewati batas toleransi"
        indicator="vermilion"
        variant="overstay"
        isSelected={false}
        onClick={() => {}}
      />
    );
    expect(htmlUnselected).toContain("aria-pressed=\"false\"");
    expect(htmlUnselected).toContain("bg-[var(--ks-paper-raised)]");
  });

  it("exports canonical KPI status colors", () => {
    expect(KPI_STATUS_COLORS).toEqual([
      "patina",
      "amber",
      "vermilion",
      "neutral",
    ]);
  });
});

describe("UiFilterToolbar Primitive", () => {
  it("renders standard container with slots for filters, search, and actions", () => {
    const html = renderToStaticMarkup(
      <UiFilterToolbar
        filterSlot={<select><option>Peran Penyetuju</option></select>}
        searchSlot={<input placeholder="Cari nama..." />}
        actionsSlot={<button>Reset</button>}
      />
    );
    expect(html).toContain("Peran Penyetuju");
    expect(html).toContain("Cari nama...");
    expect(html).toContain("Reset");
    expect(html).toContain("bg-[var(--ks-paper-raised)]");
    expect(html).toContain("border-[var(--ks-rule-subtle)]");
  });

  it("supports arbitrary children for flexible layouts", () => {
    const html = renderToStaticMarkup(
      <UiFilterToolbar>
        <span id="custom-filter">Filter Custom</span>
      </UiFilterToolbar>
    );
    expect(html).toContain("Filter Custom");
    expect(html).toContain("custom-filter");
  });
});

describe("UiBadge Primitive", () => {
  it("maps domain status APPROVED to Indonesian dictionary label and patina LED dot", () => {
    const html = renderToStaticMarkup(<UiBadge status="APPROVED" />);
    expect(html).toContain("Disetujui");
    expect(html).toContain("ks-led-patina");
    expect(html).toContain("rounded-full");
  });

  it("maps domain status OVERSTAY to Indonesian dictionary label and vermilion LED dot", () => {
    const html = renderToStaticMarkup(<UiBadge status="OVERSTAY" />);
    expect(html).toContain("Melewati Batas Waktu");
    expect(html).toContain("ks-led-vermilion");
  });

  it("maps domain status PENDING_APPROVAL to Indonesian label and amber LED dot", () => {
    const html = renderToStaticMarkup(<UiBadge status="PENDING_APPROVAL" />);
    expect(html).toContain("Menunggu Persetujuan");
    expect(html).toContain("ks-led-amber");
  });

  it("maps domain status CHECKED_OUT to neutral badge", () => {
    const html = renderToStaticMarkup(<UiBadge status="CHECKED_OUT" />);
    expect(html).toContain("Sudah Keluar");
  });

  it("supports explicit semantic variants and custom labels", () => {
    const html = renderToStaticMarkup(
      <UiBadge variant="warning" label="Koneksi Lemah" />
    );
    expect(html).toContain("Koneksi Lemah");
    expect(html).toContain("ks-led-amber");
  });

  it("exports canonical badge variants", () => {
    expect(UI_BADGE_VARIANTS).toEqual([
      "normal",
      "warning",
      "danger",
      "neutral",
    ]);
  });
});

describe("UiModal Primitive", () => {
  it("does not render when isOpen is false", () => {
    const html = renderToStaticMarkup(
      <UiModal isOpen={false} onClose={() => {}} title="Dialog Uji">
        <p>Konten tidak boleh muncul</p>
      </UiModal>
    );
    expect(html).toBe("");
  });

  it("renders accessible modal with title, backdrop blur, close button, and footer when isOpen is true", () => {
    const html = renderToStaticMarkup(
      <UiModal
        isOpen={true}
        onClose={() => {}}
        title="Check-Out Paksa Tamu"
        description="Perhatian: Tindakan ini mencabut akses segera."
        footer={<button>Konfirmasi</button>}
      >
        <p>Alasan check out wajib diisi</p>
      </UiModal>
    );
    expect(html).toContain("role=\"dialog\"");
    expect(html).toContain("aria-modal=\"true\"");
    expect(html).toContain("backdrop-blur");
    expect(html).toContain("rounded-[var(--ks-radius-md)]");
    expect(html).toContain("sm:rounded-[var(--ks-radius-md)]");
    expect(html).not.toContain("sm:rounded-2xl");
    expect(html).toContain("Check-Out Paksa Tamu");
    expect(html).toContain("Perhatian: Tindakan ini mencabut akses segera.");
    expect(html).toContain("Alasan check out wajib diisi");
    expect(html).toContain("Konfirmasi");
    expect(html).toContain("aria-label=\"Tutup dialog\"");
  });

  it("exports canonical modal sizes", () => {
    expect(UI_MODAL_SIZES).toEqual(["sm", "md", "lg", "xl", "full"]);
  });
});

describe("PageHeader Primitive", () => {
  it("renders page title, subtitle, live status badge, and guide slot", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Monitoring Tamu & Pintu"
        subtitle="Pemantauan real-time kehadiran tamu dan pintu"
        badge={idDict.header.liveMonitoring}
        guidePageKey="activeMonitoring"
      />
    );
    expect(html).toContain("Monitoring Tamu &amp; Pintu");
    expect(html).toContain("Pemantauan real-time kehadiran tamu dan pintu");
    expect(html).toContain(idDict.header.liveMonitoring);
    expect(html).toContain("Panduan Halaman Ini");
  });

  it("supports custom actions slot", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Meja Resepsionis"
        actions={<button id="tambah-tamu">Tambah Tamu</button>}
      />
    );
    expect(html).toContain("Meja Resepsionis");
    expect(html).toContain("tambah-tamu");
  });

  it("renders eyebrow above title when provided", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        eyebrow="Operasional Resepsi"
        title="Meja Resepsionis"
      />
    );
    expect(html).toContain("ks-eyebrow");
    expect(html).toContain("Operasional Resepsi");
    expect(html).toContain("Meja Resepsionis");
  });
});

describe("UiDataTable Export Integrity", () => {
  it("exports UiDataTable and useTableUrlState from index", () => {
    expect(typeof UiDataTable).toBe("function");
    expect(typeof useTableUrlState).toBe("function");
  });
});

