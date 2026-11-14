import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "./app-shell";

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
});
