import { describe, it, expect, vi } from "vitest";
import type { Pool } from "pg";
import { createPostgresClient, initPostgresDb } from "./client";

describe("PostgreSQL Database Client & Initialization", () => {
  it("creates a drizzle client instance over a mock pg Pool", () => {
    const mockPool = {
      connect: vi.fn(),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      on: vi.fn(),
    } as unknown as Pool;

    const db = createPostgresClient({ pool: mockPool });
    expect(db).toBeDefined();
    expect(db.query).toBeDefined();
  });

  it("executes getInitSchemaSql against the pool during initPostgresDb", async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
    const mockPool = {
      query: mockQuery,
      connect: vi.fn(),
      on: vi.fn(),
    } as unknown as Pool;

    const result = await initPostgresDb(mockPool);
    expect(result.ok).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain("DROP TABLE IF EXISTS facilities");
  });

  it("handles initialization failures gracefully", async () => {
    const mockQuery = vi.fn().mockRejectedValue(new Error("Connection refused"));
    const mockPool = {
      query: mockQuery,
      connect: vi.fn(),
      on: vi.fn(),
    } as unknown as Pool;

    const result = await initPostgresDb(mockPool);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Connection refused");
  });
});
