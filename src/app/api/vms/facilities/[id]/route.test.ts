import { describe, expect, it } from "vitest";
import { GET, PUT } from "./route";

describe("/api/vms/facilities/[id]", () => {
  describe("GET", () => {
    it("returns 200 with facility details", async () => {
      const response = await GET(new Request("http://localhost/api/vms/facilities/fac-jakarta"), {
        params: Promise.resolve({ id: "fac-jakarta" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.facility?.id).toBe("fac-jakarta");
      expect(body.facility?.timezone).toBe("Asia/Jakarta");
    });

    it("returns 404 when facility does not exist", async () => {
      const response = await GET(new Request("http://localhost/api/vms/facilities/fac-unknown"), {
        params: Promise.resolve({ id: "fac-unknown" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error?.kind).toBe("not_found");
    });
  });

  describe("PUT", () => {
    it("updates facility name, timezone, and overstayGraceMinutes", async () => {
      const request = new Request("http://localhost/api/vms/facilities/fac-jakarta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Jakarta HQ Updated",
          timezone: "Asia/Jakarta",
          overstayGraceMinutes: 25,
          address: "Updated Address 123",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "fac-jakarta" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(body.facility.name).toBe("Jakarta HQ Updated");
      expect(body.facility.overstayGraceMinutes).toBe(25);
      expect(body.facility.address).toBe("Updated Address 123");
    });

    it("returns 400 for invalid IANA timezone", async () => {
      const request = new Request("http://localhost/api/vms/facilities/fac-jakarta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: "Invalid/Not_A_Timezone",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "fac-jakarta" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error?.fieldErrors?.timezone).toMatch(/Invalid IANA timezone/i);
    });

    it("returns 400 for invalid overstayGraceMinutes", async () => {
      const request = new Request("http://localhost/api/vms/facilities/fac-jakarta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overstayGraceMinutes: -5,
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "fac-jakarta" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error?.fieldErrors?.overstayGraceMinutes).toBeDefined();
    });

    it("returns 404 when updating non-existent facility", async () => {
      const request = new Request("http://localhost/api/vms/facilities/fac-unknown", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nonexistent Hub",
        }),
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "fac-unknown" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.error?.kind).toBe("not_found");
    });

    it("returns 400 for invalid JSON body", async () => {
      const request = new Request("http://localhost/api/vms/facilities/fac-jakarta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json{",
      });

      const response = await PUT(request, {
        params: Promise.resolve({ id: "fac-jakarta" }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.ok).toBe(false);
    });
  });
});
