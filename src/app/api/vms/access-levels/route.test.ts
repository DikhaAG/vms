import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import { defaultVmsRepository, TEST_FIXTURE_ACCESS_LEVELS } from "@/lib/vms/repository";

describe("Route: /api/vms/access-levels", () => {
  beforeEach(async () => {
    await defaultVmsRepository.saveAccessLevels(TEST_FIXTURE_ACCESS_LEVELS);
  });

  it("GET returns 200 and lists all access levels", async () => {
    const request = new Request("http://localhost:3000/api/vms/access-levels");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.accessLevels)).toBe(true);
    expect(body.accessLevels.length).toBeGreaterThanOrEqual(3);
  });

  it("GET filters access levels by facilityId query param", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/access-levels?facilityId=fac-jakarta",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(
      body.accessLevels.every(
        (al: { facilityId: string }) => al.facilityId === "fac-jakarta",
      ),
    ).toBe(true);
  });

  it("POST creates a flat access level without facilityId and returns 201", async () => {
    const payload = {
      name: "Flat API Test Room",
      description: "Room for API testing",
      doors: ["Turnstile 10", "Door 11"],
      floors: ["2F"],
      timeScheduleId: 2,
      isDefault: false,
    };

    const request = new Request("http://localhost:3000/api/vms/access-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.accessLevel).toBeDefined();
    expect(body.accessLevel.facilityId).toBeUndefined();
    expect(body.accessLevel.name).toBe("Flat API Test Room");
    expect(body.accessLevel.doors).toEqual(["Turnstile 10", "Door 11"]);
  });

  it("POST creates a new access level and returns 201", async () => {
    const payload = {
      facilityId: "fac-jakarta",
      name: "API Test Room",
      description: "Room for API testing",
      doors: ["Turnstile 10", "Door 11"],
      floors: ["2F"],
      timeScheduleId: 2,
      isDefault: false,
    };

    const request = new Request("http://localhost:3000/api/vms/access-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.accessLevel).toBeDefined();
    expect(body.accessLevel.name).toBe("API Test Room");
    expect(body.accessLevel.doors).toEqual(["Turnstile 10", "Door 11"]);
  });

  it("POST returns 400 when body is invalid JSON", async () => {
    const request = new Request("http://localhost:3000/api/vms/access-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
  });

  it("POST returns 400 when payload fails validation", async () => {
    const request = new Request("http://localhost:3000/api/vms/access-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId: "fac-jakarta",
        name: "", // empty
        doors: [],
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
    expect(body.error?.fieldErrors).toBeDefined();
  });

  it("POST returns 404 when facility does not exist", async () => {
    const request = new Request("http://localhost:3000/api/vms/access-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facilityId: "fac-does-not-exist",
        name: "Test Name",
        doors: ["Door 1"],
        timeScheduleId: 1,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("not_found");
  });
});
