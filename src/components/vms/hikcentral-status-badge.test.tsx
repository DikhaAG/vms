import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HikCentralStatusBadge } from "./hikcentral-status-badge";

describe("HikCentralStatusBadge Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders initial state with accessible label and connection indicator", () => {
    const html = renderToStaticMarkup(
      <HikCentralStatusBadge initialStatus="online" initialLatencyMs={35} />,
    );

    expect(html).toContain("Sistem Pintu Terhubung");
    expect(html).toContain("35ms");
  });

  it("renders offline status when gateway is unreachable", () => {
    const html = renderToStaticMarkup(
      <HikCentralStatusBadge
        initialStatus="offline"
        errorMessage="Connection refused"
      />,
    );

    expect(html).toContain("Koneksi Terminal Terputus");
  });

  it("renders config missing status when environment is incomplete", () => {
    const html = renderToStaticMarkup(
      <HikCentralStatusBadge
        initialStatus="config"
        errorMessage="HIKCENTRAL_BASE_URL is not set"
      />,
    );

    expect(html).toContain("Konfigurasi Belum Lengkap");
  });

  it("defaults to checking status without optimistic online assumptions", () => {
    const html = renderToStaticMarkup(<HikCentralStatusBadge autoCheck={false} />);

    expect(html).toContain("Memeriksa Gateway...");
    expect(html).not.toContain("Sistem Pintu Terhubung");
  });
});
