import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WalkInModal } from "./walk-in-modal";
import type { AccessLevel } from "@/lib/vms/access-level-contract";
import type { HostEmployee } from "@/lib/vms/vms-contract";

describe("WalkInModal (extracted walk-in intake form)", () => {
  const accessLevels: AccessLevel[] = [
    {
      id: "acc-lobby",
      name: "Lobby Turnstiles",
      description: "Standard ground floor access",
      doors: ["Turnstile 1"],
      floors: ["1F"],
      timeScheduleId: 1,
      isDefault: true,
    },
  ];

  const hosts: HostEmployee[] = [
    { id: "hc-person-7", name: "Lestari Wulandari", departmentName: "Finance" },
    { id: "hc-person-9", name: "Yohanes Kurniawan" },
  ];

  function render(overrides: Partial<Parameters<typeof WalkInModal>[0]> = {}) {
    return renderToStaticMarkup(
      <WalkInModal
        isOpen
        onClose={vi.fn()}
        systemTimezone="Asia/Makassar"
        allAccessLevels={accessLevels}
        hosts={hosts}
        receptionist={{ id: "rec-01", name: "Front Desk" }}
        onRegistered={vi.fn()}
        {...overrides}
      />,
    );
  }

  it("lists host options from the synced HikCentral host directory", () => {
    const html = render();
    expect(html).toContain('value="hc-person-7"');
    expect(html).toContain("Lestari Wulandari (Finance)");
    expect(html).toContain('value="hc-person-9"');
    expect(html).toContain("Yohanes Kurniawan");
  });

  it("never renders a hardcoded sample host directory", () => {
    const html = render();
    expect(html).not.toContain("emp-host-0");
    expect(html).not.toContain("Budi Santoso");
    expect(html).not.toContain("emp-general");
  });

  it("explains how to populate hosts when the directory is empty", () => {
    const html = render({ hosts: [] });
    expect(html).toContain("Belum ada karyawan tuan rumah tersinkron");
    expect(html).not.toContain("<option value=\"hc-person-7\"");
  });

  it("pre-checks the default access levels and shows the system timezone", () => {
    const html = render();
    expect(html).toContain('id="walkInGivenName"');
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="acc-lobby"|<input[^>]*value="acc-lobby"[^>]*checked=""/);
    expect(html).toContain("Asia/Makassar");
  });

  it("renders nothing while closed", () => {
    expect(render({ isOpen: false })).not.toContain("walk-in-form");
  });
});
