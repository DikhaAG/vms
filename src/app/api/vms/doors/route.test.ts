import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import type { FacilityDoor } from "@/lib/vms/checkout-contract";

describe("GET /api/vms/doors", () => {
  it("returns synchronized doors queryable immediately", async () => {
    // Seed sample synchronized doors
    await defaultVmsRepository.saveDoors([
      {
        id: "door-turnstile-01",
        doorIndexCode: "door-turnstile-01",
        doorName: "Main Entrance SpeedGate",
        regionIndexCode: "reg-lobby",
        channelNo: "1",
        doorState: 1,
        isOnline: true,
        accessType: "DUAL_DIRECTION",
        isPerimeter: true,
      },
      {
        id: "door-turnstile-02",
        facilityId: "fac-jakarta",
        doorIndexCode: "door-turnstile-02",
        doorName: "Visitor Turnstile 02",
        regionIndexCode: "reg-lobby",
        channelNo: "2",
        doorState: 1,
        isOnline: true,
        accessType: "DUAL_DIRECTION",
        isPerimeter: true,
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.doors)).toBe(true);
    expect(data.doors.length).toBeGreaterThan(0);
    const turnstile = data.doors.find((d: FacilityDoor) => d.doorIndexCode === "door-turnstile-01");
    expect(turnstile).toBeDefined();
    expect(turnstile?.doorName).toBe("Main Entrance SpeedGate");
    expect(turnstile?.regionIndexCode).toBe("reg-lobby");
    expect(turnstile?.channelNo).toBe("1");
    expect(turnstile?.isOnline).toBe(true);
  });

  it("returns all doors flatly across the single site without facilityId scoping", async () => {
    await defaultVmsRepository.saveDoor({
      id: "door-flat-test-1",
      doorIndexCode: "door-flat-test-1",
      doorName: "Flat Building Gate",
      regionIndexCode: "reg-lobby",
      accessType: "DUAL_DIRECTION",
      isPerimeter: true,
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.doors)).toBe(true);
    const flatDoor = data.doors.find(
      (d: { doorIndexCode: string }) => d.doorIndexCode === "door-flat-test-1",
    );
    expect(flatDoor).toBeDefined();
    expect(flatDoor.facilityId).toBeUndefined();
    expect(flatDoor.regionIndexCode).toBe("reg-lobby");
  });

  it("returns a structured 500 when the repository throws", async () => {
    const spy = vi
      .spyOn(defaultVmsRepository, "listDoors")
      .mockRejectedValueOnce(new Error("db down"));
    try {
      const res = await GET();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        ok: false,
        error: { kind: "server", message: "db down" },
      });
    } finally {
      spy.mockRestore();
    }
  });
});
