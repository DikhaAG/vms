import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmergencyAccessModal } from "./emergency-access-modal";
import type {
  ActiveVisitSummary,
  FacilityDoor,
} from "@/lib/vms/checkout-contract";

describe("EmergencyAccessModal Component", () => {
  const mockVisit: ActiveVisitSummary = {
    visitId: "vis-modal-1",
    facility: {
      id: "fac-jakarta",
      name: "Jakarta HQ DC",
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

  const mockDoors: FacilityDoor[] = [
    {
      id: "door-1",
      doorIndexCode: "door-jkt-01",
      doorName: "Server Room A",
      facilityId: "fac-jakarta",
      accessType: "SINGLE_DIRECTION_IN",
      isPerimeter: false,
    },
    {
      id: "door-2",
      doorIndexCode: "door-jkt-02",
      doorName: "Electrical Vault",
      facilityId: "fac-jakarta",
      accessType: "DUAL_DIRECTION",
      isPerimeter: false,
    },
    {
      id: "door-3",
      doorIndexCode: "door-bali-01",
      doorName: "Bali Lab",
      facilityId: "fac-bali",
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

  it("renders modal dialog, visitor summary, and filtered doors for the visit facility", () => {
    const html = renderToStaticMarkup(
      <EmergencyAccessModal
        visit={mockVisit}
        doors={mockDoors}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain("Grant Time-Bounded Emergency Access");
    expect(html).toContain("Bruce Wayne");
    expect(html).toContain("Jakarta HQ DC");
    expect(html).toContain("Server Room A");
    expect(html).toContain("Electrical Vault");
    // Should filter out Bali door
    expect(html).not.toContain("Bali Lab");
    expect(html).toContain("Authorizing Operator ID");
    expect(html).toContain("Business Justification");
  });
});
