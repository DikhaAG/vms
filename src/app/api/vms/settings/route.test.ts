import { describe, expect, it } from "vitest";
import { GET, PUT } from "./route";

describe("Settings API: /api/vms/settings", () => {
  it("GET returns current global system settings", async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.settings).toBeDefined();
    expect(data.settings.id).toBe("default");
    expect(data.settings.timezone).toBeDefined();
    expect(data.settings.overstayGraceMinutes).toBeGreaterThanOrEqual(0);
    expect(data.settings.autoCheckInEarlyBufferMinutes).toBeGreaterThanOrEqual(0);
  });

  it("PUT updates global system settings with valid payload", async () => {
    const req = new Request("http://localhost:3000/api/vms/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone: "Asia/Makassar",
        overstayGraceMinutes: 25,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.settings.timezone).toBe("Asia/Makassar");
    expect(data.settings.overstayGraceMinutes).toBe(25);

    // Verify GET reflects update
    const getRes = await GET();
    const getData = await getRes.json();
    expect(getData.settings.timezone).toBe("Asia/Makassar");
    expect(getData.settings.overstayGraceMinutes).toBe(25);
  });

  it("PUT rejects invalid IANA timezone with 400", async () => {
    const req = new Request("http://localhost:3000/api/vms/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone: "Mars/Olympus_Mons",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.kind).toBe("validation");
  });

  it("PUT rejects non-JSON body with 400", async () => {
    const req = new Request("http://localhost:3000/api/vms/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{",
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.kind).toBe("validation");
  });
});
