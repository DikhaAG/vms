import { describe, expect, it } from "vitest";
import { PUT } from "./route";

describe("Settings API: /api/vms/settings", () => {
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
