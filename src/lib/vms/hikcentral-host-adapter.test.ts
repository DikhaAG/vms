import { describe, expect, it, vi } from "vitest";
import {
  isPersonListResponseData,
  syncHikCentralHosts,
} from "./hikcentral-host-adapter";
import { InMemoryVmsRepository } from "./repository";
import type { HikCentralClient } from "../hikcentral/client";

describe("hikcentral-host-adapter", () => {
  describe("isPersonListResponseData", () => {
    it("validates expected shape", () => {
      expect(isPersonListResponseData({ total: 10, list: [] })).toBe(true);
      expect(isPersonListResponseData({})).toBe(true);
      expect(isPersonListResponseData(null)).toBe(false);
      expect(isPersonListResponseData("string")).toBe(false);
      expect(isPersonListResponseData({ list: "not-an-array" })).toBe(false);
    });
  });

  describe("stub mode", () => {
    it("returns stub hosts and saves them into the repository", async () => {
      const repo = new InMemoryVmsRepository();
      const result = await syncHikCentralHosts({
        mode: "stub",
        repository: repo,
      });

      expect(result.ok).toBe(true);
      expect(result.totalSynced).toBe(3);
      expect(result.hosts).toHaveLength(3);

      const host = await repo.getHost("emp-101");
      expect(host).toBeDefined();
      expect(host?.name).toBe("Budi Santoso");
      expect(host?.departmentName).toBe("Engineering");
    });

    it("returns upstream error on auth-error scenario", async () => {
      const result = await syncHikCentralHosts({
        mode: "stub",
        stubScenario: "auth-error",
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("upstream");
      expect(result.error?.code).toBe("0x00072002");
    });
  });

  describe("live mode", () => {
    it("calls POST /artemis/api/resource/v1/person/advance/personList and imports hosts", async () => {
      const repo = new InMemoryVmsRepository();

      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {
          total: 2,
          pageNo: 1,
          pageSize: 500,
          list: [
            {
              personId: "hc-p-01",
              personCode: "EMP-2001",
              personName: "Maya Putri",
              email: "maya.putri@example.com",
              phoneNo: "+62811223344",
              orgIndexCode: "org-finance",
            },
            {
              personId: "hc-p-02",
              personCode: "EMP-2002",
              personName: "Doni Pratama",
              email: "doni.pratama@example.com",
              orgIndexCode: "org-marketing",
            },
          ],
        },
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralHosts({
        mode: "live",
        client: mockClient,
        repository: repo,
        personName: "Maya",
      });

      expect(result.ok).toBe(true);
      expect(result.totalSynced).toBe(2);
      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/resource/v1/person/advance/personList",
        expect.objectContaining({
          pageNo: 1,
          pageSize: 500,
          personName: "Maya",
        }),
        expect.anything(),
      );

      const maya = await repo.getHost("EMP-2001");
      expect(maya).toBeDefined();
      expect(maya?.name).toBe("Maya Putri");
      expect(maya?.email).toBe("maya.putri@example.com");
    });

    it("handles upstream error when code is not 0", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0x00072040",
        msg: "Organization index code invalid.",
        data: null,
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralHosts({
        mode: "live",
        client: mockClient,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("upstream");
      expect(result.error?.code).toBe("0x00072040");
    });
  });
});
