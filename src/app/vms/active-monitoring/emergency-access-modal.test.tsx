import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmergencyAccessModal } from "./emergency-access-modal";
import type {
  ActiveVisitSummary,
  Door,
} from "@/lib/vms/checkout-contract";

describe("EmergencyAccessModal Component (Single-Site Checklist)", () => {
  const mockVisit: ActiveVisitSummary = {
    visitId: "vis-modal-1",
    site: {
      name: "Gedung Utama",
      timezone: "Asia/Jakarta",
    },
    visitor: {
      givenName: "Bruce",
      familyName: "Wayne",
      fullName: "Bruce Wayne",
    },
    host: {
      id: "host-1",
      name: "Lucius Fox",
    },
    visitReason: "IT Infrastructure Support",
    scheduledStartTimeUtc: "2026-11-14T02:00:00.000Z",
    scheduledEndTimeUtc: "2026-11-14T10:00:00.000Z",
    checkInTimeUtc: "2026-11-14T02:05:00.000Z",
    status: "CHECKED_IN",
    tapCount: 2,
    maxTaps: 10,
    tapQuotaMode: "limited",
    isQuotaExceeded: false,
    isOverstay: false,
    overstayMinutes: 0,
    emergencyGrants: [],
  };

  const mockDoors: Door[] = [
    {
      id: "door-1",
      doorIndexCode: "door-jkt-01",
      doorName: "Server Room A",
      regionIndexCode: "reg-dc",
      accessType: "SINGLE_DIRECTION_IN",
      isPerimeter: false,
    },
    {
      id: "door-2",
      doorIndexCode: "door-jkt-02",
      doorName: "Electrical Vault",
      regionIndexCode: "reg-util",
      accessType: "DUAL_DIRECTION",
      isPerimeter: false,
    },
    {
      id: "door-3",
      doorIndexCode: "door-lab-01",
      doorName: "R&D Innovation Lab",
      regionIndexCode: "reg-rnd",
      accessType: "DUAL_DIRECTION",
      isPerimeter: false,
    },
  ];

  it("renders null when visit is null", () => {
    const html = renderToStaticMarkup(
      <EmergencyAccessModal
        visit={null}
        doors={mockDoors}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    expect(html).toBe("");
  });

  it("renders single authoritative building door checklist without facility boundaries", () => {
    const html = renderToStaticMarkup(
      <EmergencyAccessModal
        visit={mockVisit}
        doors={mockDoors}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain("Izin Akses Pintu Darurat Sementara");
    expect(html).toContain("Bruce Wayne");
    expect(html).not.toContain("Fasilitas:");
    expect(html).toContain("Server Room A");
    expect(html).toContain("Electrical Vault");
    expect(html).toContain("R&amp;D Innovation Lab");
    expect(html).toContain("ID Petugas Keamanan");
    expect(html).toContain("Alasan Justifikasi Operasional");
  });
});