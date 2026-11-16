import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/vms/reception",
}));

describe("AppShell Component", () => {
  it("renders sidebar, header, and children within a responsive shell", () => {
    const html = renderToStaticMarkup(
      <AppShell currentPath="/vms/reception">
        <div id="test-child-content">Konten Halaman Meja Resepsionis</div>
      </AppShell>
    );

    expect(html).toContain("Sistem Manajemen Tamu");
    expect(html).toContain("Meja Resepsionis");
    expect(html).toContain("test-child-content");
    expect(html).toContain("Konten Halaman Meja Resepsionis");
  });

  it("passes site name to sidebar and header and enforces overflow-hidden on main content area", () => {
    const html = renderToStaticMarkup(
      <AppShell
        currentPath="/vms/reception"
        siteName="Surabaya Industrial Hub"
        timezone="Asia/Jakarta"
      >
        <div>Anak Komponen</div>
      </AppShell>
    );

    expect(html).toContain("Surabaya Industrial Hub");
    expect(html).toContain("flex-1 flex flex-col min-w-0 overflow-hidden");
  });
});

