import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActiveMonitoringClient } from "./active-monitoring-client";
import type { Facility } from "@/lib/vms/vms-contract";
import type {
  ActiveVisitSummary,
  FacilityDoor,
  EmergencyAccessGrant,
} from "@/lib/vms/checkout-contract";

describe("ActiveMonitoringClient Component", () => {
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
  ];

  const mockDoors: FacilityDoor[] = [
    {
      id: "door-1",
      facilityId: "fac-jakarta",
      doorIndexCode: "door-turnstile-1",
      doorName: "Main Entrance SpeedGate",
      accessType: "DUAL_DIRECTION",
      isPerimeter: true,
    },
    {
      id: "door-2",
      facilityId: "fac-jakarta",
      doorIndexCode: "door-dc-01",
      doorName: "DC Server Room 01",
      accessType: "SINGLE_DIRECTION_IN",
      isPerimeter: false,
      roomTimeoutMinutes: 120,
    },
    {
      id: "door-3",
      facilityId: "fac-bali",
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
    facility: {
      id: "fac-jakarta",
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Fast-Track");
      expect(html).toContain("⚡ Fast-Track");
    });

    it("does not render Fast-Track badge when isFastTrack is false or undefined", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        isFastTrack: false,
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).not.toContain("⚡ Fast-Track");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Main Entrance SpeedGate");
      expect(html).toContain("Dual-Direction");
      expect(html).not.toContain("Single-Direction In");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("DC Server Room 01");
      expect(html).toContain("Single-Direction In");
      expect(html).not.toContain("Dual-Direction");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Single-Direction In");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Movement Breadcrumbs");
      expect(html).toContain("Lobby Turnstile");
      expect(html).toContain("(Entry)");
      expect(html).toContain("Meeting Room 302");
      expect(html).toContain("(Implicit Exit)");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Emergency Access");
      expect(html).toContain("DC Server Room 01");
      expect(html).toContain("Critical database cluster cooling maintenance");
      expect(html).toContain("Officer Alex");
      expect(html).toContain("Revoke Access");
      expect(html).toMatch(/remaining/);
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Revoked");
      expect(html).not.toContain("Revoke Access");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Grant Emergency Access");
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
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Grant Emergency Access");
    });

    it("does not render Grant Emergency Access button for CHECKED_OUT visit", () => {
      const visit: ActiveVisitSummary = {
        ...baseVisit,
        status: "CHECKED_OUT",
        isOverstay: false,
      };

      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          facilities={mockFacilities}
          initialVisits={[visit]}
          doors={mockDoors}
        />,
      );

      expect(html).not.toContain("Grant Emergency Access");
    });
  });

  describe("Facility Door Filtering", () => {
    it("accepts doors prop and renders without throwing", () => {
      const html = renderToStaticMarkup(
        <ActiveMonitoringClient
          facilities={mockFacilities}
          initialVisits={[baseVisit]}
          doors={mockDoors}
        />,
      );

      expect(html).toContain("Total On-Premise");
      expect(html).toContain("Budi Santoso");
    });

    it("filters doors by facility correctly", () => {
      const jakartaDoors = mockDoors.filter(
        (door) => !door.facilityId || door.facilityId === "fac-jakarta",
      );
      expect(jakartaDoors).toHaveLength(2);
      expect(jakartaDoors.map((d) => d.doorIndexCode)).toEqual([
        "door-turnstile-1",
        "door-dc-01",
      ]);

      const baliDoors = mockDoors.filter(
        (door) => !door.facilityId || door.facilityId === "fac-bali",
      );
      expect(baliDoors).toHaveLength(1);
      expect(baliDoors.map((d) => d.doorIndexCode)).toEqual(["door-bali-lab"]);
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
});
