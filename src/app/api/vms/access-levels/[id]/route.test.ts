import { beforeEach, describe, expect, it } from "vitest";
import { GET, PUT, DELETE } from "./route";
import { defaultVmsRepository, TEST_FIXTURE_ACCESS_LEVELS } from "@/lib/vms/repository";

describe("Route: /api/vms/access-levels/[id]", () => {
  beforeEach(async () => {
    await defaultVmsRepository.saveAccessLevels(TEST_FIXTURE_ACCESS_LEVELS);
  });

  it("GET returns 200 for an existing access level", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/access-levels/acc-jkt-lobby",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "acc-jkt-lobby" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.accessLevel).toBeDefined();
    expect(body.accessLevel.id).toBe("acc-jkt-lobby");
  });

  it("GET returns 404 for a non-existent access level", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/access-levels/acc-non-existent",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "acc-non-existent" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("not_found");
  });

  it("PUT updates an existing access level and returns 200", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/access-levels/acc-jkt-exec",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Executive Floor 3 Suite",
          doors: ["3F Elevator", "Boardroom A"],
        }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "acc-jkt-exec" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.accessLevel.name).toBe("Executive Floor 3 Suite");
  });

  it("PUT returns 400 for invalid update payload", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/access-levels/acc-jkt-exec",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "", // empty name
        }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "acc-jkt-exec" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error?.kind).toBe("validation");
  });

  it("DELETE removes an access level and returns 200", async () => {
    const request = new Request(
      "http://localhost:3000/api/vms/access-levels/acc-bali-main",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "acc-bali-main" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);

    // Verify subsequent GET returns 404
    const getRes = await GET(request, {
      params: Promise.resolve({ id: "acc-bali-main" }),
    });
    expect(getRes.status).toBe(404);
  });
});
