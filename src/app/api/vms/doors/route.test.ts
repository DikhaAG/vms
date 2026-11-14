import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/vms/doors", () => {
  it("returns list of default doors", async () => {
    const req = new Request("http://localhost:3000/api/vms/doors");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.doors)).toBe(true);
    expect(data.doors.length).toBeGreaterThan(0);
    expect(data.doors[0]).toHaveProperty("doorIndexCode");
    expect(data.doors[0]).toHaveProperty("accessType");
  });

  it("filters doors by facilityId query parameter", async () => {
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

