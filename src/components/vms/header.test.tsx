import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Header } from "./header";
import { idDict } from "@/lib/vms/i18n/id";
import type { Facility } from "@/lib/vms/vms-contract";

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
      />
    );

    expect(html).toContain(idDict.header.systemConnected);
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
  });
});

