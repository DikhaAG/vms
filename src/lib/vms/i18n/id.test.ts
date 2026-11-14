import { describe, it, expect } from "vitest";
import {
  idDict,
  formatStatusBadge,
  formatErrorMessage,
  PAGE_KEYS,
  isPageKey,
  NAV_ICON_KEYS,
  isNavIconKey,
} from "./id";

describe("Indonesian Localization Dictionary (idDict)", () => {
  it("defines all required top-level namespaces", () => {
    expect(idDict).toBeDefined();
    expect(idDict.appName).toBe("Sistem Manajemen Tamu");
    expect(idDict.navigation).toBeDefined();
    expect(idDict.common).toBeDefined();
    expect(idDict.header).toBeDefined();
    expect(idDict.statusBadges).toBeDefined();
    expect(idDict.errors).toBeDefined();
    expect(idDict.pages).toBeDefined();
  });

  describe("navigation namespace", () => {
    it("defines 3 operational groups with localized labels and items", () => {
      const { groups } = idDict.navigation;
      expect(groups.mainOperations.title).toBe("Operasional Utama");
      expect(groups.invitations.title).toBe("Pendaftaran Undangan");
      expect(groups.securityMaster.title).toBe("Master Keamanan");

      // Verify essential routes exist
      const allPaths = Object.values(groups).flatMap((g) => g.items.map((i) => i.href));
      expect(allPaths).toContain("/vms/reception");
      expect(allPaths).toContain("/vms/active-monitoring");
      expect(allPaths).toContain("/vms/approvals");
      expect(allPaths).toContain("/vms/pre-registration");
      expect(allPaths).toContain("/vms/group-registration");
      expect(allPaths).toContain("/vms/access-levels");
      expect(allPaths).toContain("/vms/visitors");
    });
  });

  describe("statusBadges namespace and helper", () => {
    const domainStatuses = [
      "PENDING_APPROVAL",
      "APPROVED",
      "CHECKED_IN",
      "OVERSTAY",
      "CHECKED_OUT",
      "REJECTED",
      "CANCELLED",
    ] as const;

    it("maps all domain statuses to friendly Indonesian labels and badge styles", () => {
      for (const status of domainStatuses) {
        const badge = formatStatusBadge(status);
        expect(badge.label).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.className).toBeTruthy();
      }

      expect(formatStatusBadge("PENDING_APPROVAL").label).toBe("Menunggu Persetujuan");
      expect(formatStatusBadge("APPROVED").label).toBe("Disetujui");
      expect(formatStatusBadge("CHECKED_IN").label).toBe("Sedang Berkunjung");
      expect(formatStatusBadge("OVERSTAY").label).toBe("Melewati Batas Waktu");
      expect(formatStatusBadge("CHECKED_OUT").label).toBe("Sudah Keluar");
      expect(formatStatusBadge("REJECTED").label).toBe("Ditolak");
      expect(formatStatusBadge("CANCELLED").label).toBe("Dibatalkan");
    });

    it("falls back gracefully for unknown status codes", () => {
      const badge = formatStatusBadge("UNKNOWN_STATUS" as unknown as string);
      expect(badge.label).toBe("Status Tidak Dikenal");
    });
  });

  describe("errors namespace and helper", () => {
    it("translates error kinds into polite Indonesian guidance", () => {
      expect(formatErrorMessage("validation", "Nama wajib diisi")).toContain("Data tidak lengkap atau tidak valid");
      expect(formatErrorMessage("not_found")).toContain("Data tidak ditemukan");
      expect(formatErrorMessage("upstream")).toContain("Gagal terhubung ke perangkat kontrol pintu");
      expect(formatErrorMessage("conflict")).toContain("Terjadi benturan data atau jadwal");
    });
  });

  describe("pages namespace and rich guide content", () => {
    it("includes all defined PAGE_KEYS in pages dictionary", () => {
      for (const key of PAGE_KEYS) {
        expect(idDict.pages[key]).toBeDefined();
        expect(idDict.pages[key].title).toBeTruthy();
        expect(idDict.pages[key].guide).toBeDefined();
      }
    });

    it("verifies every page guide contains the 5 mandatory sections", () => {
      for (const key of PAGE_KEYS) {
        const guide = idDict.pages[key].guide;
        // 1. Purpose (Penjelasan Tujuan)
        expect(guide.purpose.length).toBeGreaterThan(15);
        // 2. Role (Peran Penanggung Jawab)
        expect(guide.role.length).toBeGreaterThan(5);
        // 3. Steps (Langkah Operasional 1-2-3)
        expect(guide.steps.length).toBeGreaterThanOrEqual(3);
        guide.steps.forEach((s, idx) => {
          expect(s.step).toBe(idx + 1);
          expect(s.title).toBeTruthy();
          expect(s.description).toBeTruthy();
        });
        // 4. Status Badges & Symbols (Arti Warna Status & Simbol)
        expect(guide.badgeMeanings.length).toBeGreaterThanOrEqual(2);
        guide.badgeMeanings.forEach((b) => {
          expect(b.label).toBeTruthy();
          expect(b.color).toBeTruthy();
          expect(b.description).toBeTruthy();
        });
        // 5. Common Solutions / FAQ (Solusi Masalah Umum)
        expect(guide.faqs.length).toBeGreaterThanOrEqual(2);
        guide.faqs.forEach((faq) => {
          expect(faq.question).toBeTruthy();
          expect(faq.answer).toBeTruthy();
        });
      }
    });
  });

  describe("runtime type guards (CODING_STANDARDS conformance)", () => {
    it("isPageKey validates genuine page keys and rejects invalid strings", () => {
      PAGE_KEYS.forEach((key) => {
        expect(isPageKey(key)).toBe(true);
      });
      expect(isPageKey("invalidKey")).toBe(false);
      expect(isPageKey(123)).toBe(false);
      expect(isPageKey(null)).toBe(false);
    });

    it("isNavIconKey validates supported navigation icon keys", () => {
      NAV_ICON_KEYS.forEach((key) => {
        expect(isNavIconKey(key)).toBe(true);
      });
      expect(isNavIconKey("random-icon")).toBe(false);
      expect(isNavIconKey(null)).toBe(false);
    });
  });
});
