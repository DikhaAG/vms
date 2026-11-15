import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Sidebar } from "./sidebar";
import { idDict } from "@/lib/vms/i18n/id";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/reception",
}));

describe("Sidebar Component", () => {
  it("renders desktop sidebar with branding and all 3 navigation groups", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" />
    );

    expect(html).toContain(idDict.appName);
    expect(html).toContain(idDict.navigation.groups.mainOperations.title);
    expect(html).toContain(idDict.navigation.groups.invitations.title);
    expect(html).toContain(idDict.navigation.groups.securityMaster.title);
  });

  it("renders all 7 operational navigation items", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" />
    );

    expect(html).toContain("Meja Resepsionis");
    expect(html).toContain("Monitoring Tamu &amp; Pintu");
    expect(html).toContain("Persetujuan Kunjungan");
    expect(html).toContain("Buat Undangan Tamu");
    expect(html).toContain("Pendaftaran Rombongan");
    expect(html).toContain("Hak Akses Pintu");
    expect(html).toContain("Buku Tamu &amp; Biometrik");
  });

  it("highlights the active route with aria-current='page'", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/active-monitoring" />
    );

    expect(html).toContain('href="/vms/active-monitoring"');
    expect(html).toContain('aria-current="page"');
  });

  it("renders collapsed desktop rail when collapsed is true", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" collapsed={true} />
    );

    // Should render collapse toggle with expanded=false
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders mobile drawer and backdrop when mobileOpen is true", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" mobileOpen={true} />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Menu Navigasi Mobile"');
    expect(html).toContain('aria-label="Tutup menu navigasi"');
  });

  it("does not render mobile drawer when mobileOpen is false", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" mobileOpen={false} />
    );

    expect(html).not.toContain('aria-label="Menu Navigasi Mobile"');
  });

  it("renders bottom footer dock with 'Ciutkan Menu' button in expanded mode", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" collapsed={false} />
    );

    expect(html).toContain("mt-auto border-t");
    expect(html).toContain(`aria-label="${idDict.navigation.collapseMenu}"`);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(idDict.navigation.collapseMenu);
  });

  it("renders bottom footer dock with centered square expand button and centered brand mark 'V' in collapsed mode", () => {
    const html = renderToStaticMarkup(
      <Sidebar currentPath="/vms/reception" collapsed={true} />
    );

    expect(html).toContain("mt-auto border-t");
    expect(html).toContain(`aria-label="${idDict.navigation.expandMenu}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(">V<");
    expect(html).toContain("w-18");
  });

  it("renders mobile drawer with prominent top telemetry block showing active facility and timezone clock", () => {
    const html = renderToStaticMarkup(
      <Sidebar
        currentPath="/vms/reception"
        mobileOpen={true}
        selectedFacility={{
          id: "fac-bali",
          name: "Bali Innovation Center",
          timezone: "Asia/Makassar",
        }}
      />
    );

    expect(html).toContain("Bali Innovation Center");
    expect(html).toContain("WITA");
    expect(html).toContain("--:--:--");
  });
});

