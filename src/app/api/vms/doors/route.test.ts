import { describe, expect, it } from "vitest";
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

    const req = new Request("http://localhost:3000/api/vms/doors");
    const res = await GET(req);
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

  it("filters doors by facilityId query parameter if specified", async () => {
    const req = new Request("http://localhost:3000/api/vms/doors?facilityId=fac-jakarta");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.doors)).toBe(true);
    for (const door of data.doors) {
      expect(door.facilityId).toBe("fac-jakarta");
    }
  });
});

