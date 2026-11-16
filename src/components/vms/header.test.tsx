import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Header } from "./header";
import { idDict } from "@/lib/vms/i18n/id";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/reception",
}));

describe("Header Component", () => {
  const siteName = "Jakarta Corporate HQ";
  const timezone = "Asia/Jakarta";

  it("renders hamburger toggle button for mobile navigation", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain('aria-label="Buka menu navigasi"');
  });

  it("renders the single-site name label", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain("Jakarta Corporate HQ");
  });

  it("renders timezone indicator for the site timezone", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    // Asia/Jakarta renders as WIB
    expect(html).toContain("WIB");
  });

  it("renders hardware system health status indicator", () => {
    const html = renderToStaticMarkup(
      <Header
        siteName={siteName}
        timezone={timezone}
        currentPath="/vms/reception"
        systemHealthy={true}
      />
    );

    expect(html).toContain(idDict.header.systemConnected);
  });

  it("renders offline hardware status indicator when systemHealthy is false", () => {
    const html = renderToStaticMarkup(
      <Header
        siteName={siteName}
        timezone={timezone}
        currentPath="/vms/reception"
        systemHealthy={false}
      />
    );

    expect(html).toContain(idDict.header.systemDisconnected);
  });

  it("renders checking gateway indicator when systemHealthy is undefined", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain("Memeriksa Gateway...");
    expect(html).not.toContain(idDict.header.systemConnected);
    expect(html).not.toContain("Sistem Pintu Terhubung");
  });

  it("renders active operator role chip and avatar", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain(idDict.header.operatorRole);
  });

  it("renders localized breadcrumb based on current path", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/active-monitoring" />
    );

    expect(html).toContain("Monitoring Tamu &amp; Pintu");
    expect(html).toContain("Operasional Utama");
  });

  it("prevents hydration mismatch when client initial render occurs after server render time", () => {
    vi.useFakeTimers();
    try {
      // Step 1: Server renders at T1 (12:19:17)
      vi.setSystemTime(new Date("2026-11-14T05:19:17.000Z"));
      const serverHtml = renderToStaticMarkup(
        <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
      );

      // Step 2: Client hydrates at T2 (12:19:18)
      vi.setSystemTime(new Date("2026-11-14T05:19:18.000Z"));
      const clientInitialHtml = renderToStaticMarkup(
        <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
      );

      // The initial markup generated on server and client before effects run must be identical
      // to avoid Next.js / React hydration mismatch ("12.19.18" vs "12.19.17").
      expect(serverHtml).toEqual(clientInitialHtml);
      expect(serverHtml).toContain("--:--:--");
    } finally {
      vi.useRealTimers();
    }
  });

  it("enforces strict overflow constraints on header container", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain("max-w-full overflow-hidden");
  });

  it("hides live second clock and timezone badge on screens < 640px via responsive utility classes", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain("hidden sm:flex items-center gap-1.5");
  });

  it("truncates breadcrumb active page title on mobile viewports", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/active-monitoring" />
    );

    expect(html).toContain("truncate max-w-[120px] sm:max-w-none");
  });

  it("applies responsive max-width truncation to site name label to prevent horizontal overflow", () => {
    const html = renderToStaticMarkup(
      <Header siteName={siteName} timezone={timezone} currentPath="/vms/reception" />
    );

    expect(html).toContain("max-w-[120px] sm:max-w-none truncate");
  });
});
