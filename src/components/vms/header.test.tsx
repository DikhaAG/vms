import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Header } from "./header";
import { idDict } from "@/lib/vms/i18n/id";
import type { Facility } from "@/lib/vms/vms-contract";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/reception",
}));

describe("Header Component", () => {
  const mockFacilities: Facility[] = [
    {
      id: "fac-jakarta",
      name: "Jakarta Corporate HQ",
      timezone: "Asia/Jakarta",
    },
    {
      id: "fac-bali",
      name: "Bali Innovation Center",
      timezone: "Asia/Makassar",
    },
    {
      id: "fac-jayapura",
      name: "Jayapura Logistics Hub",
      timezone: "Asia/Jayapura",
    },
  ];

  it("renders hamburger toggle button for mobile navigation", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
      />
    );

    expect(html).toContain('aria-label="Buka menu navigasi"');
  });

  it("renders facility selector with provided facilities", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
      />
    );

    expect(html).toContain("Jakarta Corporate HQ");
    expect(html).toContain("Bali Innovation Center");
    expect(html).toContain("Jayapura Logistics Hub");
  });

  it("renders timezone indicator for selected facility", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
      />
    );

    // Jakarta is Asia/Jakarta (WIB)
    expect(html).toContain("WIB");
  });

  it("renders hardware system health status indicator", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
        systemHealthy={true}
      />
    );

    expect(html).toContain(idDict.header.systemConnected);
  });

  it("renders offline hardware status indicator when systemHealthy is false", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
        systemHealthy={false}
      />
    );

    expect(html).toContain(idDict.header.systemDisconnected);
  });

  it("renders checking gateway indicator when systemHealthy is undefined", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
      />
    );

    expect(html).toContain("Memeriksa Gateway...");
  });

  it("renders active operator role chip and avatar", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/reception"
      />
    );

    expect(html).toContain(idDict.header.operatorRole);
  });

  it("renders localized breadcrumb based on current path", () => {
    const html = renderToStaticMarkup(
      <Header
        facilities={mockFacilities}
        selectedFacilityId="fac-jakarta"
        currentPath="/vms/active-monitoring"
      />
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
        <Header
          facilities={mockFacilities}
          selectedFacilityId="fac-jakarta"
          currentPath="/vms/reception"
        />
      );

      // Step 2: Client hydrates at T2 (12:19:18)
      vi.setSystemTime(new Date("2026-11-14T05:19:18.000Z"));
      const clientInitialHtml = renderToStaticMarkup(
        <Header
          facilities={mockFacilities}
          selectedFacilityId="fac-jakarta"
          currentPath="/vms/reception"
        />
      );

      // The initial markup generated on server and client before effects run must be identical
      // to avoid Next.js / React hydration mismatch ("12.19.18" vs "12.19.17").
      expect(serverHtml).toEqual(clientInitialHtml);
      expect(serverHtml).toContain("--:--:--");
    } finally {
      vi.useRealTimers();
    }
  });
});

