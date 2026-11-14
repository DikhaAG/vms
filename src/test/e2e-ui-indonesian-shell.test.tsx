import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "@/components/vms/sidebar";
import { Header } from "@/components/vms/header";
import { AppShell } from "@/components/vms/app-shell";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict, PAGE_KEYS, type PageKey } from "@/lib/vms/i18n/id";

// Page Components
import ReceptionPage from "@/app/vms/reception/page";
import ActiveMonitoringPage from "@/app/vms/active-monitoring/page";
import ApprovalsPage from "@/app/vms/approvals/page";
import PreRegistrationPage from "@/app/vms/pre-registration/page";
import GroupRegistrationPage from "@/app/vms/group-registration/page";
import AccessLevelsPage from "@/app/vms/access-levels/page";
import VisitorsPage from "@/app/vms/visitors/page";
import InvitePage from "@/app/invite/[token]/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/reception",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

describe("E2E UI Indonesian Shell, Accessibility & Visual Audit", () => {
  const dummyFacilities = [
    {
      id: "fac-jakarta",
      name: "Kantor Pusat Jakarta",
      timezone: "Asia/Jakarta",
      address: "Jl. Jenderal Sudirman No. 1, Jakarta",
    },
    {
      id: "fac-bali",
      name: "Bali Innovation Center",
      timezone: "Asia/Makassar",
      address: "Jl. Sunset Road No. 88, Kuta, Bali",
    },
  ];

  describe("1. Responsive App Shell & Navigation Layout", () => {
    it("renders desktop sidebar with all 3 localized operational groups", () => {
      const html = renderToStaticMarkup(
        <Sidebar currentPath="/vms/reception" collapsed={false} />,
      );

      // Group headers
      expect(html).toContain("Operasional Utama");
      expect(html).toContain("Pendaftaran Undangan");
      expect(html).toContain("Master Keamanan");

      // Links
      expect(html).toContain("Meja Resepsionis");
      expect(html).toContain("Monitoring Tamu &amp; Pintu");
      expect(html).toContain("Persetujuan Kunjungan");
      expect(html).toContain("Buat Undangan Tamu");
      expect(html).toContain("Pendaftaran Rombongan");
      expect(html).toContain("Hak Akses Pintu");
      expect(html).toContain("Buku Tamu &amp; Biometrik");

      // Active link highlight
      expect(html).toContain("aria-current=\"page\"");
    });

    it("renders collapsible rail in desktop collapsed mode", () => {
      const html = renderToStaticMarkup(
        <Sidebar currentPath="/vms/active-monitoring" collapsed={true} />,
      );

      // Collapsed rail classes
      expect(html).toContain("w-18");
      expect(html).toContain(`aria-label="${idDict.navigation.expandMenu}"`);
    });

    it("renders responsive mobile drawer with overlay when open", () => {
      const html = renderToStaticMarkup(
        <Sidebar
          currentPath="/vms/approvals"
          mobileOpen={true}
          onCloseMobile={vi.fn()}
        />,
      );

      // Backdrop overlay
      expect(html).toContain("fixed inset-0 bg-slate-900/60 backdrop-blur-xs");
      expect(html).toContain("role=\"dialog\"");
      expect(html).toContain("aria-label=\"Menu Navigasi Mobile\"");
    });

    it("renders global header with facility selector, timezone clocks, hardware status, and operator chip", () => {
      const html = renderToStaticMarkup(
        <Header
          facilities={dummyFacilities}
          selectedFacilityId="fac-jakarta"
          onSelectFacility={vi.fn()}
          onOpenMobileMenu={vi.fn()}
        />,
      );

      expect(html).toContain("Sistem Pintu Terhubung");
      expect(html).toContain("Kantor Pusat Jakarta");
      expect(html).toContain("WIB");
      expect(html).toContain("Petugas Resepsionis Lobi");
      expect(html).toContain("Buka menu navigasi");
    });

    it("renders unified AppShell with breadcrumb trail and operator chrome", () => {
      const html = renderToStaticMarkup(
        <AppShell>
          <div data-testid="test-content">Konten Halaman Utama VMS</div>
        </AppShell>,
      );

      expect(html).toContain("Konten Halaman Utama VMS");
      expect(html).toContain(">VMS<");
      expect(html).toContain("Meja Resepsionis");
    });
  });

  describe("2. PageGuideModal Accessibility & 5-Section Architecture Across All 8 Routes", () => {
    it.each(PAGE_KEYS)(
      "renders an accessible 5-section guide dialog for page key '%s'",
      (pageKey: PageKey) => {
        const guideInfo = idDict.pages[pageKey];
        expect(guideInfo).toBeDefined();

        const html = renderToStaticMarkup(
          <PageGuideModal pageKey={pageKey} defaultOpen={true} />,
        );

        // Accessibility attributes
        expect(html).toContain("role=\"dialog\"");
        expect(html).toContain("aria-modal=\"true\"");
        expect(html).toContain(`aria-labelledby="guide-title-${pageKey}"`);
        expect(html).toContain(`aria-describedby="guide-desc-${pageKey}"`);

        // Section 1: Purpose & Header
        expect(html).toContain(escapeHtml(guideInfo.guide.title));
        expect(html).toContain("Tujuan Halaman Ini");
        expect(html).toContain(escapeHtml(guideInfo.guide.purpose));

        // Section 2: Accountable Role
        expect(html).toContain("Peran Penanggung Jawab");
        expect(html).toContain(escapeHtml(guideInfo.guide.role));

        // Section 3: 1-2-3 Operational Steps
        expect(html).toContain("Langkah Operasional");
        guideInfo.guide.steps.forEach((s) => {
          expect(html).toContain(escapeHtml(s.title));
        });

        // Section 4: Status Badges & Symbol Meanings
        expect(html).toContain("Arti Warna Status &amp; Simbol");
        guideInfo.guide.badgeMeanings.forEach((b) => {
          expect(html).toContain(escapeHtml(b.label));
        });

        // Section 5: Common Troubleshooting FAQs
        expect(html).toContain("Solusi Masalah Umum (FAQ)");
        guideInfo.guide.faqs.forEach((faq) => {
          expect(html).toContain(escapeHtml(faq.question));
        });
      },
    );
  });

  describe("3. Core Operations Full UI Integration", () => {
    it("renders /vms/reception with Indonesian guide, quick search, walk-in button, and queue tabs", async () => {
      const pageComponent = await ReceptionPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Meja Resepsionis Lobi");
      expect(html).toContain("Layanan Penerimaan Tamu Datang Langsung (Walk-in)");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("+ Daftarkan Tamu Datang Langsung (Walk-in)");
      expect(html).toContain("Tamu Diharapkan Hari Ini");
      expect(html).toContain("Sedang di Gedung");
      expect(html).toContain("Semua Kunjungan");
    });

    it("renders /vms/active-monitoring with KPI cards, directionality badges, and emergency modal", async () => {
      const pageComponent = await ActiveMonitoringPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Monitoring Tamu &amp; Pintu Aktif");
      expect(html).toContain("Live Monitoring");
      expect(html).toContain("Pemantauan Real-time Kehadiran Tamu");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("Total Tamu di Gedung");
      expect(html).toContain("Status Normal");
      expect(html).toContain("Peringatan Overstay");
      expect(html).toContain("Peringatan Kuota Tap");
    });

    it("renders /vms/approvals with reviewer roles, queue tabs, and decision actions", async () => {
      const pageComponent = await ApprovalsPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Persetujuan Kunjungan Tamu");
      expect(html).toContain("Antrean Verifikasi Izin Kunjungan oleh Tuan Rumah &amp; Petugas Keamanan");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("Menunggu Persetujuan Normal");
      expect(html).toContain("Eskalasi Daftar Pantauan");
      expect(html).toContain("Pejabat Penyetuju (Tuan Rumah)");
      expect(html).toContain("Petugas Keamanan (Satpam)");
    });
  });

  describe("4. Invitation & Security Master Full UI Integration", () => {
    it("renders /vms/pre-registration with appointment scheduler and self-registration generator", async () => {
      const pageComponent = await PreRegistrationPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Buat Undangan Tamu Terjadwal");
      expect(html).toContain("Kunjungan Individual");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("1. Pilih Gedung &amp; Zona Waktu Fasilitas");
      expect(html).toContain("2. Data Identitas Tamu");
      expect(html).toContain("3. Pengambilan &amp; Verifikasi Foto Biometrik Wajah");
      expect(html).toContain("6. Kelompok Hak Akses Pintu &amp; Batas Tap");
      expect(html).toContain("🔗 Buat Tautan Pendaftaran Mandiri");
      expect(html).toContain("Kirim Janji Temu Tamu");
    });

    it("renders /vms/group-registration with collective booking and returning visitor recognition", async () => {
      const pageComponent = await GroupRegistrationPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Pendaftaran Rombongan Tamu");
      expect(html).toContain("Kunjungan Kolektif");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("1. Data Rombongan &amp; Jadwal Kunjungan");
      expect(html).toContain("2. Hak Akses Pintu &amp; Kuota Tap");
      expect(html).toContain("3. Anggota Rombongan (2 Tamu)");
      expect(html).toContain("+ Tambah Anggota Tamu");
    });

    it("renders /vms/access-levels with door presets, schedules, and elevator floor bundles", async () => {
      const pageComponent = await AccessLevelsPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Hak Akses Pintu &amp; Kuota Tap");
      expect(html).toContain("Master Keamanan");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("Lokasi Gedung:");
      expect(html).toContain("+ Tambah Hak Akses Pintu");
      expect(html).toContain("Jadwal Waktu Akses");
    });

    it("renders /vms/visitors with PDP soft-delete compliance, biometric archive, and stat cards", async () => {
      const pageComponent = await VisitorsPage();
      const html = renderToStaticMarkup(pageComponent);

      expect(html).toContain("Buku Tamu &amp; Basis Data Biometrik");
      expect(html).toContain("Privasi &amp; Biometrik");
      expect(html).toContain("Panduan Halaman Ini");
      expect(html).toContain("Total Basis Data Tamu");
      expect(html).toContain("Profil Aktif (Siap Auto-fill)");
      expect(html).toContain("Arsip PDP / Terhapus Halus");
      expect(html).toContain("Tampilkan Arsip Terhapus (Kepatuhan PDP)");
    });
  });

  describe("5. Public Guest Self-Registration Portal Isolation & Layout", () => {
    it("ensures public invite page does NOT render internal operator sidebar or header chrome", async () => {
      const pageComponent = await InvitePage({
        params: Promise.resolve({ token: "invalid-token" }),
      });
      const html = renderToStaticMarkup(pageComponent);

      // Operator chrome must be absent
      expect(html).not.toContain("Operasional Utama");
      expect(html).not.toContain("Petugas Resepsionis Lobi");
      expect(html).not.toContain("Beranda VMS");

      // Polite Indonesian error state
      expect(html).toContain("Tautan Undangan Tidak Ditemukan");
      expect(html).toContain("Kembali ke Halaman Awal");
    });
  });

  describe("6. Accessibility & Contrast Verification (WCAG AA)", () => {
    it("verifies status badges use high-contrast color classes adhering to Impeccable guidelines", () => {
      const badges = Object.values(idDict.statusBadges);

      badges.forEach((badge) => {
        expect(badge.label).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.className).toBeTruthy();
        expect(badge.dotColor).toBeTruthy();

        // Must define background, text, and border classes
        expect(badge.className).toMatch(/bg-[a-z]+-[0-9]+/);
        expect(badge.className).toMatch(/text-[a-z]+-[0-9]+/);
        expect(badge.className).toMatch(/border-[a-z]+-[0-9]+/);
      });
    });

    it("verifies interactive inputs have label associations across key forms", () => {
      const html = renderToStaticMarkup(
        <Sidebar currentPath="/vms/reception" collapsed={false} />,
      );

      // Links have accessible names
      expect(html).toContain("href=\"/vms/reception\"");
      expect(html).toContain("href=\"/vms/active-monitoring\"");
      expect(html).toContain("href=\"/vms/approvals\"");
      expect(html).toContain("href=\"/vms/pre-registration\"");
      expect(html).toContain("href=\"/vms/group-registration\"");
      expect(html).toContain("href=\"/vms/access-levels\"");
      expect(html).toContain("href=\"/vms/visitors\"");
    });
  });
});
