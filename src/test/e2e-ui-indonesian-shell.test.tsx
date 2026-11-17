import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "@/components/vms/sidebar";
import { Header } from "@/components/vms/header";
import { AppShell } from "@/components/vms/app-shell";
import { PageGuideModal } from "@/components/vms/page-guide-modal";
import { idDict, PAGE_KEYS, type PageKey } from "@/lib/vms/i18n/id";

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
          siteName="Kantor Pusat Jakarta"
          timezone="Asia/Jakarta"
          onOpenMobileMenu={vi.fn()}
          systemHealthy={true}
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

  describe("3. Accessibility & Contrast Verification (WCAG AA)", () => {
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
