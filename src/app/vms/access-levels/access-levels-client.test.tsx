import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AccessLevelsClient } from "./access-levels-client";
import { AccessLevelFormModal } from "./access-level-form-modal";
import AccessLevelsPage from "./page";
import type { AccessLevel } from "@/lib/vms/access-level-contract";

describe("AccessLevels UI Localization", () => {
  const dummyAccessLevels: AccessLevel[] = [
    {
      id: "al-lobby",
      name: "Pintu Masuk Lobi Utama",
      description: "Akses gerbang lobi dan pintu putar lantai 1",
      doors: ["Lobby SpeedGate A"],
      floors: ["1F"],
      timeScheduleId: 2,
      isDefault: true,
      createdAtUtc: "2026-01-01T00:00:00Z",
      updatedAtUtc: "2026-01-01T00:00:00Z",
    },
  ];

  it("renders localized filter bar, cards, and buttons flatly without facility selector", () => {
    const html = renderToStaticMarkup(
      <AccessLevelsClient
        initialAccessLevels={dummyAccessLevels}
      />,
    );

    expect(html).not.toContain("Lokasi Gedung:");
    expect(html).toContain("Sinkronkan Pintu dari Server HikCentral");
    expect(html).toContain("+ Tambah Hak Akses Pintu");
    expect(html).toContain("Pintu Masuk Lobi Utama");
    expect(html).toContain("Standar");
    expect(html).toContain("Jadwal Waktu Akses");
    expect(html).toContain("Pintu Diberikan (1)");
    expect(html).toContain("Akses Lantai Lift (1)");
    expect(html).toContain("Ubah");
    expect(html).toContain("Hapus");
  });

  it("renders page header with PageGuideModal for accessLevels", async () => {
    const pageComponent = await AccessLevelsPage();
    const html = renderToStaticMarkup(pageComponent);

    expect(html).toContain("Hak Akses Pintu &amp; Kuota Tap");
    expect(html).toContain("Master Keamanan");
    expect(html).toContain("Panduan Halaman Ini");
    expect(html).toContain("aria-haspopup=\"dialog\"");
  });

  it("renders AccessLevelFormModal with UiModal and complete door checklist without facility selector", () => {
    const html = renderToStaticMarkup(
      <AccessLevelFormModal
        isOpen={true}
        editingLevel={null}
        availableDoors={[
          {
            doorIndexCode: "door-01",
            doorName: "Pintu Putar Lobi",
            isPerimeter: true,
            accessType: "SINGLE_DIRECTION_IN",
          },
        ]}
        isSyncingDoors={false}
        isSubmitting={false}
        formErrors={{}}
        onClose={() => {}}
        onSyncDoors={async () => {}}
        onSave={async () => {}}
      />,
    );

    expect(html).toContain("Buat Kelompok Hak Akses Baru");
    expect(html).toContain("role=\"dialog\"");
    expect(html).toContain("aria-modal=\"true\"");
    expect(html).not.toContain("Gedung / Lokasi Fasilitas *");
    expect(html).toContain("Nama Kelompok Hak Akses *");
    expect(html).toContain("Daftar Pintu Fisik Server HikCentral *");
    expect(html).toContain("Pintu Putar Lobi");
    expect(html).toContain("Batal");
    expect(html).toContain("Buat Hak Akses");
  });
});
