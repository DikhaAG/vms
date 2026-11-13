import { describe, it, expect, vi } from "vitest";
import {
  syncHikCentralEmergencyGrant,
  revokeHikCentralEmergencyGrant,
} from "./hikcentral-emergency-adapter";
import { HikCentralError, type HikCentralClient } from "../hikcentral/client";

describe("hikcentral-emergency-adapter", () => {
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
    it("dispatches POST to Artemis endpoint and returns success", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: "",
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
      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/single/addPersons",
        expect.objectContaining({
          type: 2,
          list: [{ id: "vis-hc-101" }],
        }),
        expect.objectContaining({
          userId: "sec-user-1",
        }),
      );
    });

    it("dispatches revocation to deletePersons Artemis endpoint", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: "",
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      const res = await revokeHikCentralEmergencyGrant(
        {
          visitId: "vis-101",
          visitorId: "vis-hc-101",
          doorIndexCodes: ["door-jkt-dc-01"],
          userId: "sec-user-1",
        },
        { mode: "live", client: mockClient },
      );

      expect(res.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/single/deletePersons",
        expect.objectContaining({
          type: 2,
          list: [{ id: "vis-hc-101" }],
        }),
        expect.objectContaining({
          userId: "sec-user-1",
        }),
      );
    });
  });
});
