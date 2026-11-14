import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceptionClient } from "./reception-client";
import type { Facility, Visit } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";

describe("ReceptionClient Component Localization", () => {
  const mockFacilities: Facility[] = [
    {
      id: "fac-jakarta",
      name: "Jakarta Corporate HQ",
      timezone: "Asia/Jakarta",
    },
  ];

  const mockAccessLevels: AccessLevel[] = [
    {
      id: "acc-1",
      facilityId: "fac-jakarta",
      name: "Lobby Turnstiles",
      description: "Standard ground floor access",
      doors: ["Turnstile 1"],
      floors: ["1F"],
      timeScheduleId: 1,
      isDefault: true,
    },
  ];

  const mockVisits: Visit[] = [
    {
      id: "vis-rec-1",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "Santoso",
      visitorGivenName: "Budi",
      visitorPhone: "+628123456789",
      visitorEmail: "budi@example.com",
      certificateType: 111,
      certificateNo: "3171012345670001",
      visitReasonType: 0,
      scheduledStartTimeFacility: "2026-11-14T09:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-14T17:00:00+07:00",
      scheduledStartTimeUtc: "2026-11-14T02:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-14T10:00:00.000Z",
      status: "APPROVED",
      hostId: "host-1",
      hostName: "Alice Smith",
      createdAtUtc: "2026-11-14T01:00:00.000Z",
      updatedAtUtc: "2026-11-14T01:00:00.000Z",
    },
    {
      id: "vis-rec-2",
      facilityId: "fac-jakarta",
      facilityName: "Jakarta Corporate HQ",
      visitorFamilyName: "Pratama",
      visitorGivenName: "Doni",
      visitorPhone: "+628123456788",
      visitorEmail: "doni@example.com",
      certificateType: 111,
      certificateNo: "3171012345670002",
      visitReasonType: 1,
      scheduledStartTimeFacility: "2026-11-14T08:00:00+07:00",
      scheduledEndTimeFacility: "2026-11-14T16:00:00+07:00",
      scheduledStartTimeUtc: "2026-11-14T01:00:00.000Z",
      scheduledEndTimeUtc: "2026-11-14T09:00:00.000Z",
      status: "CHECKED_IN",
      actualCheckInTimeUtc: "2026-11-14T01:05:00.000Z",
      hostId: "host-2",
      hostName: "Bob Johnson",
      createdAtUtc: "2026-11-14T00:30:00.000Z",
      updatedAtUtc: "2026-11-14T01:05:00.000Z",
    },
  ];

  it("renders Indonesian action button for walk-in registration", () => {
    const html = renderToStaticMarkup(
      <ReceptionClient
        facilities={mockFacilities}
        allAccessLevels={mockAccessLevels}
        initialVisits={mockVisits}
      />
    );

    expect(html).toContain("Daftarkan Tamu Datang Langsung (Walk-in)");
  });

  it("renders status tabs in Indonesian", () => {
    const html = renderToStaticMarkup(
      <ReceptionClient
        facilities={mockFacilities}
        allAccessLevels={mockAccessLevels}
        initialVisits={mockVisits}
      />
    );

    expect(html).toContain("Tamu Diharapkan Hari Ini");
    expect(html).toContain("Sedang di Gedung");
    expect(html).toContain("Semua Kunjungan");
  });

  it("renders card details and action buttons in Indonesian", () => {
    const html = renderToStaticMarkup(
      <ReceptionClient
        facilities={mockFacilities}
        allAccessLevels={mockAccessLevels}
        initialVisits={mockVisits}
      />
    );

    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Karyawan Tuan Rumah:");
    expect(html).toContain("Gedung:");
    expect(html).toContain("Keperluan:");
    expect(html).toContain("Verifikasi &amp; Proses Masuk");
  });
});
