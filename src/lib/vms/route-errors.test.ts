import { describe, expect, it } from "vitest";
import { withServerErrors } from "./route-errors";

describe("withServerErrors", () => {
  it("returns the handler's response untouched when it succeeds", async () => {
    const handler = withServerErrors(async (request: Request) =>
      Response.json({ ok: true, url: request.url }, { status: 201 }),
    );

    const res = await handler(new Request("http://localhost/api/vms/x"));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, url: "http://localhost/api/vms/x" });
  });

  it("turns a thrown Error into the structured 500 envelope", async () => {
    const handler = withServerErrors(async () => {
      throw new Error("db down");
    });

    const res = await handler();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      error: { kind: "server", message: "db down" },
    });
  });

  it("uses a generic message when something other than an Error is thrown", async () => {
    const handler = withServerErrors(async () => {
      throw "boom";
    });

    const res = await handler();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      error: { kind: "server", message: "Internal server error." },
    });
  });
});
