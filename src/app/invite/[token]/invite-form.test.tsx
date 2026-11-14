import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InviteForm } from "./invite-form";
import InvitePage from "./page";
import type { PublicInvitationMetadata } from "@/lib/vms/invitation-contract";

describe("Public Invite Self-Registration UI Localization", () => {
  const dummyInitialData: PublicInvitationMetadata = {
    visitId: "vis-12345",
    token: "valid-tok-123",
    status: "valid",
    facility: {
      id: "fac-jakarta",
      name: "Kantor Pusat Jakarta",
      timezone: "Asia/Jakarta",
      address: "Jl. Jenderal Sudirman No. 1, Jakarta",
    },
    host: {
      id: "emp-101",
      name: "Budi Santoso",
    },
    visitReasonType: 3,
    visitReasonLabel: "Rapat / Meeting",
    scheduledStartTimeFacility: "2026-11-15 10:00:00",
    scheduledEndTimeFacility: "2026-11-15 12:00:00",
    scheduledStartTimeUtc: "2026-11-15T03:00:00.000Z",
    scheduledEndTimeUtc: "2026-11-15T05:00:00.000Z",
    expiresAtUtc: "2026-11-15T05:00:00.000Z",
    isConsumed: false,
    prefilledVisitor: {
      givenName: "Rian",
      familyName: "Pratama",
      phone: "+628123456789",
      email: "rian.pratama@example.com",
    },
  };

  it("renders localized form inputs, photo tips, and submit button in Indonesian", () => {
    const html = renderToStaticMarkup(
      <InviteForm token="valid-tok-123" initialData={dummyInitialData} />,
    );

    expect(html).toContain("Data Diri Tamu");
    expect(html).toContain("Nama Depan <span class=\"text-red-500\">*</span>");
    expect(html).toContain("Nama Belakang / Marga <span class=\"text-red-500\">*</span>");
    expect(html).toContain("Foto Wajah Biometrik (Akses Cepat Pintu Putar)");
    expect(html).toContain("📷 Gunakan Kamera");
    expect(html).toContain("📁 Unggah Foto");
    expect(html).toContain("Panduan Pengambilan Foto Selfie:");
    expect(html).toContain("Selesaikan Pendaftaran &amp; Dapatkan Tiket →");
  });

  it("renders expired or invalid invite state in polite Indonesian", async () => {
    const pageComponent = await InvitePage({
      params: Promise.resolve({ token: "invalid-token" }),
    });
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Tautan Undangan Tidak Ditemukan");
    expect(html).toContain("Kode token undangan tidak valid atau tidak terdaftar");
    expect(html).toContain("Kembali ke Halaman Awal");
  });
});
