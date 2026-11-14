import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import * as adapter from "@/lib/vms/hikcentral-door-adapter";

vi.mock("@/lib/vms/hikcentral-door-adapter", () => ({
  syncHikCentralDoors: vi.fn(),
}));

describe("POST /api/vms/sync/doors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles valid sync request and returns 200 with synced doors", async () => {
    const mockSync = vi.mocked(adapter.syncHikCentralDoors).mockResolvedValue({
      ok: true,
      totalSynced: 2,
      doors: [
        {
          id: "door-101",
          facilityId: "fac-main-01",
          doorIndexCode: "101",
          doorName: "Main Entrance",
          accessType: "DUAL_DIRECTION",
          isPerimeter: true,
        },
        {
          id: "door-102",
          facilityId: "fac-main-01",
          doorIndexCode: "102",
          doorName: "Meeting Room 1",
          accessType: "DUAL_DIRECTION",
          isPerimeter: false,
        },
      ],
    });

    const request = new Request("http://localhost/api/vms/sync/doors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilityId: "fac-main-01" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.totalSynced).toBe(2);
    expect(data.doors).toHaveLength(2);
    expect(mockSync).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "fac-main-01",
      }),
    );
  });

  it("returns 400 when body contains invalid JSON", async () => {
    const request = new Request("http://localhost/api/vms/sync/doors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error.kind).toBe("validation");
  });

  it("returns 400 when body is malformed even without application/json header", async () => {
    const request = new Request("http://localhost/api/vms/sync/doors", {
      method: "POST",
      body: "malformed-json-payload",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error.kind).toBe("validation");
    expect(data.error.message).toContain("must be valid JSON");
  });

  it("returns 400 when body is a JSON array instead of an object", async () => {
    const request = new Request("http://localhost/api/vms/sync/doors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(["invalid", "array"]),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error.kind).toBe("validation");
    expect(data.error.message).toContain("must be a JSON object");
  });

  it("returns 502 when upstream HikCentral fails", async () => {
    vi.mocked(adapter.syncHikCentralDoors).mockResolvedValue({
      ok: false,
      totalSynced: 0,
      doors: [],
      error: {
        kind: "upstream",
        message: "HikCentral connection refused",
        code: "0x00072002",
      },
    });

    const request = new Request("http://localhost/api/vms/sync/doors", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.ok).toBe(false);
    expect(data.error.kind).toBe("upstream");
    expect(data.error.message).toContain("connection refused");
  });
});

