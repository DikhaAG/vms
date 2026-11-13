import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/vms/facilities", () => {
  it("returns 200 and list of facilities with timezones", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.facilities).toBeDefined();
    expect(body.facilities.length).toBeGreaterThanOrEqual(3);

    const timezones = body.facilities.map((f: { timezone: string }) => f.timezone);
    expect(timezones).toContain("Asia/Jakarta");
    expect(timezones).toContain("Asia/Makassar");
    expect(timezones).toContain("Asia/Jayapura");
  });
});
