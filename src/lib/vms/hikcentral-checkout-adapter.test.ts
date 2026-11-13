import { describe, it, expect, vi } from "vitest";
import {
  executeHikCentralCheckOut,
  isCheckOutResponseData,
} from "./hikcentral-checkout-adapter";
import type { HikCentralClient } from "../hikcentral/client";

describe("hikcentral-checkout-adapter", () => {
  describe("stub mode", () => {
    it("returns successful check-out result in stub mode with success scenario", async () => {
      const res = await executeHikCentralCheckOut("hc-rec-123", {
        mode: "stub",
        stubScenario: "success",
      });

      expect(res.ok).toBe(true);
      expect(res.appointRecordId).toBe("hc-rec-123");
      expect(res.code).toBe("0");
    });

    it("throws HikCentralError on auth-error stub scenario", async () => {
      await expect(
        executeHikCentralCheckOut("hc-rec-123", {
          mode: "stub",
          stubScenario: "auth-error",
        }),
      ).rejects.toThrow(/appKey does not exist or signature verification failed/i);
    });

    it("throws HikCentralError on network-error stub scenario", async () => {
      await expect(
        executeHikCentralCheckOut("hc-rec-123", {
          mode: "stub",
          stubScenario: "network-error",
        }),
      ).rejects.toThrow(/ECONNREFUSED/i);
    });

    it("throws when appointRecordId is empty", async () => {
      await expect(
        executeHikCentralCheckOut("", {
          mode: "stub",
        }),
      ).rejects.toThrow(/appointRecordId is required/i);
    });
  });

  describe("live client mode", () => {
    it("calls POST /artemis/api/visitor/v1/visitor/out with appointRecordId and returns ok on code 0", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: null,
      });
      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      const res = await executeHikCentralCheckOut("hc-rec-456", {
        mode: "live",
        client: mockClient,
        userId: "admin-sec-01",
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/visitor/v1/visitor/out",
        {
          appointRecordId: "hc-rec-456",
        },
        {
          userId: "admin-sec-01",
        },
      );
      expect(res.ok).toBe(true);
      expect(res.appointRecordId).toBe("hc-rec-456");
      expect(res.code).toBe("0");
    });

    it("throws HikCentralError when upstream returns non-zero code", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0x00072005",
        msg: "Appointment record does not exist or already checked out.",
        data: null,
      });
      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      await expect(
        executeHikCentralCheckOut("hc-rec-nonexistent", {
          mode: "live",
          client: mockClient,
        }),
      ).rejects.toThrow(/0x00072005/i);
    });

    it("throws HikCentralError when code is 0 but response.data fails validation", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: [1, 2, 3], // invalid shape (array instead of object/null/string)
      });
      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      await expect(
        executeHikCentralCheckOut("hc-rec-456", {
          mode: "live",
          client: mockClient,
        }),
      ).rejects.toThrow(/data payload is malformed/i);
    });

    it("isCheckOutResponseData validates supported data shapes", () => {
      expect(isCheckOutResponseData(null)).toBe(true);
      expect(isCheckOutResponseData(undefined)).toBe(true);
      expect(isCheckOutResponseData({})).toBe(true);
      expect(isCheckOutResponseData("")).toBe(true);
      expect(isCheckOutResponseData([1, 2])).toBe(false);
      expect(isCheckOutResponseData(12345)).toBe(false);
    });
  });
});
