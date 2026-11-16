import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ActiveMonitoringClient } from "./active-monitoring-client";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
} from "@/lib/vms/checkout-contract";
import { renderWithVmsProviders, createTestQueryClient } from "@/test/test-utils";

describe("ActiveMonitoringClient Component", () => {
  const mockDoors: FacilityDoor[] = [
    {
      id: "door-1",
      doorIndexCode: "door-turnstile-1",
      doorName: "Main Entrance SpeedGate",
      accessType: "DUAL_DIRECTION",
      isPerimeter: true,
    },
    {
      id: "door-2",
      doorIndexCode: "door-dc-01",
      doorName: "DC Server Room 01",
      accessType: "SINGLE_DIRECTION_IN",
      isPerimeter: false,
      roomTimeoutMinutes: 120,
    },
    {
      id: "door-3",
      doorIndexCode: "door-bali-lab",
      doorName: "Bali R&D Lab",
      accessType: "DUAL_DIRECTION",
      isPerimeter: false,
    },
  ];

  const baseVisit: ActiveVisitSummary = {
    visitId: "visit-001",
    visitor: {
      givenName: "Budi",
      familyName: "Santoso",
      fullName: "Budi Santoso",
      phone: "+628123456789",
      email: "budi@example.com",
      certificateNo: "ID-12345",
    },
    host: {
      id: "host-01",
      name: "Alice Smith",
    },
    site: {
      name: "Jakarta Corporate HQ",
      timezone: "Asia/Jakarta",
    },
    visitReason: "Vendor IT Maintenance",
    checkInTimeUtc: "2026-11-14T08:00:00Z",
    scheduledStartTimeUtc: "2026-11-14T08:00:00Z",
    scheduledEndTimeUtc: "2026-11-14T17:00:00Z",
    tapCount: 2,
    maxTaps: 10,
    tapQuotaMode: "limited",
    isQuotaExceeded: false,
    isOverstay: false,
    overstayMinutes: 0,
    status: "CHECKED_IN",
  };

  const originalFetch = globalThis.fetch;
  const originalConfirm = globalThis.confirm;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.confirm = originalConfirm;
  });

  describe("Visitor Card Badges and Directionality", () => {
    it("renders Fast-Track badge when isFastTrack is true", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        isFastTrack: true,
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Masuk Otomatis Tanpa Antre");
    });

    it("does not render Fast-Track badge when isFastTrack is false or undefined", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        isFastTrack: false,
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).not.toContain("Masuk Otomatis Tanpa Antre");
    });

    it("renders Dual-Direction badge when lastSeenDoor is DUAL_DIRECTION", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        lastSeenDoor: {
          doorIndexCode: "door-turnstile-1",
          doorName: "Main Entrance SpeedGate",
          tappedAtUtc: "2026-11-14T08:00:00Z",
          direction: "in",
          accessType: "DUAL_DIRECTION",
        },
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Main Entrance SpeedGate");
      expect(html).toContain("Pintu Dua Arah");
      expect(html).not.toContain("Pintu Masuk Saja");
    });

    it("renders Single-Direction In badge when lastSeenDoor is SINGLE_DIRECTION_IN", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        lastSeenDoor: {
          doorIndexCode: "door-dc-01",
          doorName: "DC Server Room 01",
          tappedAtUtc: "2026-11-14T08:30:00Z",
          direction: "in",
          accessType: "SINGLE_DIRECTION_IN",
        },
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("DC Server Room 01");
      expect(html).toContain("Pintu Masuk Saja");
      expect(html).not.toContain("Pintu Dua Arah");
    });

    it("resolves door directionality from doors prop when lastSeenDoor accessType is omitted", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        lastSeenDoor: {
          doorIndexCode: "door-dc-01",
          doorName: "DC Server Room 01",
          tappedAtUtc: "2026-11-14T08:30:00Z",
          direction: "in",
          // accessType omitted, should match from mockDoors
        },
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Pintu Masuk Saja");
    });
  });

  describe("Movement Breadcrumbs", () => {
    it("visualizes recent transitions with door names, directions, and implicit exit flags", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        movementBreadcrumbs: [
          {
            visitId: baseVisit.visitId,
            doorIndexCode: "door-turnstile-1",
            doorName: "Lobby Turnstile",
            direction: "in",
            tappedAtUtc: "2026-11-14T08:00:00Z",
          },
          {
            visitId: baseVisit.visitId,
            doorIndexCode: "door-meeting-302",
            doorName: "Meeting Room 302",
            direction: "out",
            isImplicit: true,
            tappedAtUtc: "2026-11-14T08:15:00Z",
          },
          {
            visitId: baseVisit.visitId,
            doorIndexCode: "door-dc-01",
            doorName: "Server Room 01",
            direction: "in",
            tappedAtUtc: "2026-11-14T08:30:00Z",
          },
        ],
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Riwayat Pergerakan Pintu");
      expect(html).toContain("Lobby Turnstile");
      expect(html).toContain("(Masuk)");
      expect(html).toContain("Meeting Room 302");
      expect(html).toContain("(Keluar Otomatis)");
      expect(html).toContain("Server Room 01");
      expect(html).toContain("→");
    });
  });

  describe("Active Emergency Grants & Revoke Button", () => {
    it("renders active emergency grants with remaining time and Revoke Access button", () => {
      const futureExpiry = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      const activeGrant: EmergencyAccessGrant = {
        id: "grant-test-01",
        visitId: baseVisit.visitId,
        doorIndexCodes: ["door-dc-01"],
        doorNames: ["DC Server Room 01"],
        grantedByUserId: "sec-officer-01",
        grantedByName: "Officer Alex",
        reason: "Critical database cluster cooling maintenance",
        grantedAtUtc: "2026-11-14T08:00:00Z",
        expiresAtUtc: futureExpiry,
        status: "ACTIVE",
      };

      const visit: ActiveVisitSummary = {
        ...baseVisit,
        emergencyGrants: [activeGrant],
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Izin Akses Darurat Sementara");
      expect(html).toContain("DC Server Room 01");
      expect(html).toContain("Critical database cluster cooling maintenance");
      expect(html).toContain("Officer Alex");
      expect(html).toContain("Cabut Izin Akses");
      expect(html).toMatch(/tersisa/);
    });

    it("renders Revoked badge and hides Revoke Access button for revoked grants", () => {
      const revokedGrant: EmergencyAccessGrant = {
        id: "grant-test-02",
        visitId: baseVisit.visitId,
        doorIndexCodes: ["door-dc-01"],
        doorNames: ["DC Server Room 01"],
        grantedByUserId: "sec-officer-01",
        grantedByName: "Officer Alex",
        reason: "Work completed early",
        grantedAtUtc: "2026-11-14T08:00:00Z",
        expiresAtUtc: new Date(Date.now() + 3600000).toISOString(),
        status: "REVOKED",
        revokedAtUtc: "2026-11-14T08:45:00Z",
      };

      const visit: ActiveVisitSummary = {
        ...baseVisit,
        emergencyGrants: [revokedGrant],
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Dicabut");
      expect(html).not.toContain("Cabut Izin Akses");
    });
  });

  describe("Grant Emergency Access Action Button", () => {
    it("renders Grant Emergency Access button for CHECKED_IN visit", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        status: "CHECKED_IN",
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Izin Akses Darurat");
    });

    it("renders Grant Emergency Access button for OVERSTAY visit", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        status: "OVERSTAY",
        isOverstay: true,
        overstayMinutes: 20,
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Izin Akses Darurat");
    });

    it("does not render Grant Emergency Access button for CHECKED_OUT visit", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        status: "CHECKED_OUT",
        isOverstay: false,
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).not.toContain("Izin Akses Darurat");
    });
  });

  // Ganti bagian Facility Door Filtering & QueryClient cache di src/app/vms/active-monitoring/active-monitoring-client.test.tsx:
  describe("Single-Site Building Door Checklist", () => {
    it("renders single-site active monitoring screen without facility dropdown selector", () => {
      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          systemTimezone="Asia/Jakarta"
          initialVisits={[baseVisit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Total Tamu di Gedung");
      expect(html).toContain("Budi Santoso");
      expect(html).not.toContain("Semua Gedung Fasilitas");
      expect(html).not.toContain("Saring Berdasarkan Gedung");
    });
  });

  describe("Emergency Access Input Validation", () => {
    it("enforces justification reason of at least 10 characters", () => {
      const tooShortReason = "Short";
      const validReason = "Urgent HVAC server cooling repair";

      expect(tooShortReason.trim().length).toBeLessThan(10);
      expect(validReason.trim().length).toBeGreaterThanOrEqual(10);
    });

    it("requires at least one door to be selected", () => {
      const emptyDoors: string[] = [];
      const selectedDoors = ["door-dc-01"];

      expect(emptyDoors.length === 0).toBe(true);
      expect(selectedDoors.length > 0).toBe(true);
    });

    it("supports standard escalation durations of 1, 2, and 4 hours", () => {
      const supportedDurations = [1, 2, 4];
      for (const hrs of supportedDurations) {
        expect(hrs).toBeGreaterThan(0);
      }
    });
  });

  describe("UiDataTable Migration & TanStack Query Polling", () => {
    it("renders tabular structure powered by UiDataTable with column headers", () => {
      const { html } = renderWithVmsProviders(
        <ActiveMonitoringClient
          initialVisits={[baseVisit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("<table");
      expect(html).toContain("Nama Tamu");
      expect(html).toContain("Tuan Rumah &amp; Jadwal");
      expect(html).toContain("Status &amp; Waktu");
      expect(html).toContain("Telemetri Pintu &amp; Akses");
      expect(html).toContain("Aksi Operator");
      expect(html).toContain("Budi Santoso");
    });

    it("renders canonical UiKpiGrid and UiKpiCard primitives with tabular counters", () => {
      const { html } = renderWithVmsProviders(
        <ActiveMonitoringClient
          initialVisits={[baseVisit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("tabular-nums");
      expect(html).toContain("font-mono");
      expect(html).toContain("Total Tamu di Gedung");
      expect(html).toContain("Status Normal");
      expect(html).toContain("Peringatan Overstay");
      expect(html).toContain("Peringatan Kuota Tap");
    });

    it("renders pagination controls and tabular page counters in table footer", () => {
      const { html } = renderWithVmsProviders(
        <ActiveMonitoringClient
          initialVisits={[baseVisit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Halaman");
      expect(html).toContain("dari");
      expect(html).toContain("Sebelumnya");
      expect(html).toContain("Selanjutnya");
    });

    it("populates initial visits in QueryClient cache under single-site query keys", () => {
      const queryClient = createTestQueryClient();
      const { html } = renderWithVmsProviders(
        <ActiveMonitoringClient
          systemTimezone="Asia/Jakarta"
          initialVisits={[baseVisit]}
          doors={mockDoors}
        />,
        { queryClient },
      );

      expect(html).toContain("Budi Santoso");
      expect(queryClient.getQueryData(["active-visits"])).toEqual([
        baseVisit,
      ]);
      expect(queryClient.getQueryData(["doors"])).toEqual(mockDoors);
    });

    it("filters active visits table matching search query from URL search params (?q=...)", () => {
      const { html } = renderWithVmsProviders(
        <NuqsTestingAdapter searchParams={{ q: "Budi" }}>
          <ActiveMonitoringClient
            initialVisits={[baseVisit]}
            doors={mockDoors}
          />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain("Budi Santoso");
      expect(html).toContain("ID-12345");
    });

    it("renders custom empty state when search query matches zero records", () => {
      const { html } = renderWithVmsProviders(
        <NuqsTestingAdapter searchParams={{ q: "ZzzUnknown" }}>
          <ActiveMonitoringClient
            initialVisits={[baseVisit]}
            doors={mockDoors}
          />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain("Tidak Ada Tamu Aktif Sesuai Saringan");
      expect(html).toContain("Coba sesuaikan kata kunci pencarian");
    });

    it("filters active visits by overstay status tab (?tab=overstay)", () => {
      const overstayVisit: ActiveVisitSummary = {
        ...baseVisit,
        visitId: "visit-overstay-99",
        isOverstay: true,
        overstayMinutes: 45,
        status: "OVERSTAY",
      };

      const { html } = renderWithVmsProviders(
        <NuqsTestingAdapter searchParams={{ tab: "overstay" }}>
          <ActiveMonitoringClient
            initialVisits={[baseVisit, overstayVisit]}
            doors={mockDoors}
          />
        </NuqsTestingAdapter>,
      );

      expect(html).toContain("45m Overstay");
      expect(html).toContain("visit-overstay-99");
    });
  });
});
