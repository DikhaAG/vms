import { describe, it, expect, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceptionClient } from "./reception-client";
import ReceptionPage from "./page";
import { DEFAULT_SYSTEM_SETTINGS, type Visit } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { defaultCheckInService } from "@/lib/vms/checkin-service";

describe("Reception Desk & Walk-In UI (Ticket 05)", () => {
  const mockAccessLevels: AccessLevel[] = [
    {
      id: "acc-1",
      name: "Lobby Turnstiles",
      description: "Standard ground floor access",
      doors: ["Turnstile 1", "Turnstile 2"],
      floors: ["1F"],
      timeScheduleId: 1,
      isDefault: true,
    },
  ];

  const mockVisits: Visit[] = [
    {
      id: "vis-rec-1",
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

  afterEach(async () => {
    await defaultVmsRepository.updateSettings({
      timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
    });
  });

  it("renders single-site reception dashboard without any facility filter in UiFilterToolbar", () => {
    const html = renderToStaticMarkup(
      <ReceptionClient
        systemTimezone="Asia/Jakarta"
        allAccessLevels={mockAccessLevels}
        initialVisits={mockVisits}
      />,
    );

    // AC #1: No facility selector in toolbar or page
    expect(html).not.toContain("Semua Gedung Fasilitas");
    expect(html).not.toContain("Saring Berdasarkan Gedung");
    expect(html).toContain("Daftarkan Tamu Datang Langsung (Walk-in)");
    expect(html).toContain("Tamu Diharapkan Hari Ini");
    expect(html).toContain("Sedang di Gedung");
    expect(html).toContain("Semua Kunjungan");
  });

  it("wires ReceptionPage server component to global systemSettings without facility list", async () => {
    await defaultVmsRepository.updateSettings({ timezone: "Asia/Makassar" });

    const pageComponent = await ReceptionPage();
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Meja Resepsionis");
    expect(html).toContain("Asia/Makassar");
    expect(html).not.toContain("Semua Gedung Fasilitas");
  });

  it("renders card details and check-in action buttons without facility boundaries", () => {
    const html = renderToStaticMarkup(
      <ReceptionClient
        systemTimezone="Asia/Jakarta"
        allAccessLevels={mockAccessLevels}
        initialVisits={mockVisits}
      />,
    );

    expect(html).toContain("Budi Santoso");
    expect(html).toContain("Karyawan Tuan Rumah:");
    expect(html).toContain("Keperluan:");
    expect(html).toContain("Verifikasi &amp; Proses Masuk");
    expect(html).not.toContain("Gedung Fasilitas");
  });

  it("renders issued badge modal with site-wide access levels and print action after walk-in intake", async () => {
    const outcome = await defaultCheckInService.createWalkInVisit({
      hostId: "emp-host-01",
      hostName: "Budi Santoso",
      visitorGivenName: "Rina",
      visitorFamilyName: "Maharani",
      certificateType: 111,
      certificateNo: "3171055566677788",
      visitReasonType: 0,
      receptionistUserId: "rec-01",
      receptionistName: "Dewi Frontdesk",
      verificationMethod: "id_card",
      mode: "stub",
      stubScenario: "success",
    });

    expect(outcome.ok).toBe(true);
    expect(outcome.pass).toBeDefined();

    const html = renderToStaticMarkup(
      <ReceptionClient
        systemTimezone="Asia/Jakarta"
        allAccessLevels={mockAccessLevels}
        initialVisits={[outcome.visit!]}
        initialIssuedPass={outcome.pass}
      />,
    );

    expect(html).toContain("Lencana Kunjungan Tamu");
    expect(html).toContain("Lencana Masuk Aktif");
    expect(html).toContain("Rina Maharani");
    expect(html).toContain(outcome.pass!.pinCode!);
    expect(html).toContain("Cetak Lencana Tamu");
  });
});