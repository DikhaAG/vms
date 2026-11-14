import { describe, it, expect, vi } from "vitest";
import {
  syncHikCentralEmergencyGrant,
  revokeHikCentralEmergencyGrant,
  isHikCentralEmergencyResponseData,
} from "./hikcentral-emergency-adapter";
import { HikCentralError, type HikCentralClient } from "../hikcentral/client";

describe("hikcentral-emergency-adapter", () => {
  describe("isHikCentralEmergencyResponseData runtime guard", () => {
    it("returns true for non-null objects and records", () => {
      expect(isHikCentralEmergencyResponseData({})).toBe(true);
      expect(isHikCentralEmergencyResponseData({ status: "ok", code: 0 })).toBe(true);
      expect(isHikCentralEmergencyResponseData({ nested: { a: 1 } })).toBe(true);
    });

    it("returns false for non-objects, arrays, and nullish values", () => {
      expect(isHikCentralEmergencyResponseData(null)).toBe(false);
      expect(isHikCentralEmergencyResponseData(undefined)).toBe(false);
      expect(isHikCentralEmergencyResponseData("")).toBe(false);
      expect(isHikCentralEmergencyResponseData("string")).toBe(false);
      expect(isHikCentralEmergencyResponseData(123)).toBe(false);
      expect(isHikCentralEmergencyResponseData(true)).toBe(false);
      expect(isHikCentralEmergencyResponseData([])).toBe(false);
      expect(isHikCentralEmergencyResponseData(["item"])).toBe(false);
    });
  });

  describe("stub mode", () => {
    it("returns success on normal stub execution", async () => {
      const syncRes = await syncHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          visitorId: "vis-hc-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          expiresAtUtc: "2026-11-13T12:00:00.000Z",
          userId: "sec-user-1",
        },
        { mode: "stub" },
      );
      expect(syncRes.success).toBe(true);
      expect(syncRes.synchronized).toBe(true);

      const revokeRes = await revokeHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          visitorId: "vis-hc-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          userId: "sec-user-1",
        },
        { mode: "stub" },
      );
      expect(revokeRes.success).toBe(true);
      expect(revokeRes.revoked).toBe(true);
    });

    it("throws HikCentralError on auth-error scenario", async () => {
      await expect(
        syncHikCentralEmergencyGrant(
          {
            visitId: "vis-101",
            doorIndexCodes: ["door-jkt-dc-01"],
            expiresAtUtc: "2026-11-13T12:00:00.000Z",
          },
          { mode: "stub", stubScenario: "auth-error" },
        ),
      ).rejects.toThrow(HikCentralError);
    });

    it("throws network error on network-error scenario", async () => {
      await expect(
        revokeHikCentralEmergencyGrant(
          {
            visitId: "vis-101",
            doorIndexCodes: ["door-jkt-dc-01"],
          },
          { mode: "stub", stubScenario: "network-error" },
        ),
      ).rejects.toThrow(/network/i);
    });
  });

  describe("live mode with mock client", () => {
    it("dispatches POST to Artemis endpoint and returns success for a single door", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {},
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      const res = await syncHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          visitorId: "vis-hc-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          expiresAtUtc: "2026-11-13T12:00:00.000Z",
          userId: "sec-user-1",
        },
        { mode: "live", client: mockClient },
      );

      expect(res.success).toBe(true);
      expect(mockPost).toHaveBeenCalledTimes(1);
      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/single/addPersons",
        expect.objectContaining({
          privilegeGroupId: "door-jkt-dc-01",
          type: 2,
          list: [{ id: "vis-hc-101" }],
        }),
        expect.objectContaining({
          userId: "sec-user-1",
        }),
      );
    });

    it("iterates over all doorIndexCodes so all target doors receive controller grants", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {},
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      const doors = ["door-01", "door-02", "door-03"];
      const res = await syncHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          visitorId: "vis-hc-101",
          doorIndexCodes: doors,
          expiresAtUtc: "2026-11-13T12:00:00.000Z",
          userId: "sec-user-1",
        },
        { mode: "live", client: mockClient },
      );

      expect(res.success).toBe(true);
      expect(mockPost).toHaveBeenCalledTimes(3);
      for (const door of doors) {
        expect(mockPost).toHaveBeenCalledWith(
          "/artemis/api/acs/v1/privilege/group/single/addPersons",
          expect.objectContaining({
            privilegeGroupId: door,
            type: 2,
            list: [{ id: "vis-hc-101" }],
          }),
          expect.objectContaining({
            userId: "sec-user-1",
          }),
        );
      }
    });

    it("falls back to default privilege group when doorIndexCodes is empty", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {},
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      await syncHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          doorIndexCodes: [],
          expiresAtUtc: "2026-11-13T12:00:00.000Z",
        },
        { mode: "live", client: mockClient },
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/single/addPersons",
        expect.objectContaining({
          privilegeGroupId: "emergency-access-group",
        }),
        expect.anything(),
      );
    });

    it("throws HikCentralError when response data fails the runtime guard", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: "invalid-string-data",
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      await expect(
        syncHikCentralEmergencyGrant(
          {
            visitId: "vis-101",
            doorIndexCodes: ["door-jkt-dc-01"],
            expiresAtUtc: "2026-11-13T12:00:00.000Z",
          },
          { mode: "live", client: mockClient },
        ),
      ).rejects.toThrow(/data payload is malformed/i);
    });

    it("throws HikCentralError when API response code is non-zero", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0x00072010",
        msg: "Privilege group person synchronization failed.",
        data: {},
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      await expect(
        syncHikCentralEmergencyGrant(
          {
            visitId: "vis-101",
            doorIndexCodes: ["door-jkt-dc-01"],
            expiresAtUtc: "2026-11-13T12:00:00.000Z",
          },
          { mode: "live", client: mockClient },
        ),
      ).rejects.toThrow(HikCentralError);
    });

    it("dispatches revocation across multiple doors to deletePersons endpoint", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {},
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      const doors = ["door-jkt-dc-01", "door-jkt-dc-02"];
      const res = await revokeHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          visitorId: "vis-hc-101",
          doorIndexCodes: doors,
          userId: "sec-user-1",
        },
        { mode: "live", client: mockClient },
      );

      expect(res.success).toBe(true);
      expect(mockPost).toHaveBeenCalledTimes(2);
      for (const door of doors) {
        expect(mockPost).toHaveBeenCalledWith(
          "/artemis/api/acs/v1/privilege/group/single/deletePersons",
          expect.objectContaining({
            privilegeGroupId: door,
            type: 2,
            list: [{ id: "vis-hc-101" }],
          }),
          expect.objectContaining({
            userId: "sec-user-1",
          }),
        );
      }
    });
  });
});
