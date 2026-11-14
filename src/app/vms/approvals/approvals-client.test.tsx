import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApprovalsClient } from "./approvals-client";
import type { Facility, Visit } from "@/lib/vms/vms-contract";

describe("ApprovalsClient Component Localization", () => {
  const mockFacilities: Facility[] = [
    {
      id: "fac-jakarta",
      name: "Jakarta Corporate HQ",
      timezone: "Asia/Jakarta",
    },
  ];

  const mockPendingVisits: Visit[] = [
    {
      id: "vis-app-1",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "Wijaya",
      visitorGivenName: "Citra",
      visitorPhone: "+628123456780",
      visitorEmail: "citra@example.com",
      certificateType: 111,
      certificateNo: "3171012345670003",
      visitReasonType: 0,
      scheduledStartTimeFacility: "2026-11-14T10:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-14T12:00:00+07:00",
      scheduledStartTimeUtc: "2026-11-14T03:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-14T05:00:00.000Z",
      status: "PENDING_APPROVAL",
      hostId: "host-1",
      hostName: "Budi Santoso",
      createdAtUtc: "2026-11-14T02:00:00.000Z",
      updatedAtUtc: "2026-11-14T02:00:00.000Z",
    },
  ];

  const mockEscalatedVisits: Visit[] = [];

  it("renders Indonesian persona roles and tab headings", () => {
    const html = renderToStaticMarkup(
      <ApprovalsClient
        facilities={mockFacilities}
        initialPendingVisits={mockPendingVisits}
        initialEscalatedVisits={mockEscalatedVisits}
      />
    );

    expect(html).toContain("Pejabat Penyetuju (Tuan Rumah)");
    expect(html).toContain("Petugas Keamanan (Satpam)");
    expect(html).toContain("Menunggu Persetujuan Normal");
    expect(html).toContain("Eskalasi Daftar Pantauan");
  });

  it("renders approval action buttons in Indonesian", () => {
    const html = renderToStaticMarkup(
      <ApprovalsClient
        facilities={mockFacilities}
        initialPendingVisits={mockPendingVisits}
        initialEscalatedVisits={mockEscalatedVisits}
      />
    );

    expect(html).toContain("Citra Wijaya");
    expect(html).toContain("Setujui Kunjungan");
    expect(html).toContain("Tolak Kunjungan");
  });
});

