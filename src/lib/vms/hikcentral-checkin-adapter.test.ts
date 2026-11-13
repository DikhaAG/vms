import { describe, expect, it, vi } from "vitest";
import {
  executeHikCentralCheckIn,
  type HikCentralCheckInParams,
} from "./hikcentral-checkin-adapter";
import { HikCentralError, type HikCentralClient } from "../hikcentral/client";

describe("hikcentral-checkin-adapter", () => {
  const baseParams: HikCentralCheckInParams = {
    visitStartTime: "2026-11-13T10:00:00+07:00",
    visitEndTime: "2026-11-13T14:00:00+07:00",
    visitPurposeType: 0,
    visitPurpose: "Vendor discussion",
    receptionistId: "emp-host-01",
    visitorFamilyName: "Santoso",
    visitorGivenName: "Budi",
    phoneNo: "+62812345678",
    email: "budi.santoso@example.com",
    certificateType: 111,
    certificateNo: "3171010101010001",
    qrCodeValidNum: 2,
    accessLevels: [{ id: "acc-jkt-lobby", name: "Lobby" }],
  };

  describe("stub mode", () => {
    it("returns successful check-in result with appointRecordId, visitorId, qrCodeImage, and pinCode", async () => {
      const result = await executeHikCentralCheckIn(
        {
          ...baseParams,
          appointId: "orig-apt-123",
        },
        { mode: "stub", stubScenario: "success" },
      );

      expect(result.appointRecordId).toBeDefined();
      expect(result.visitorId).toBeDefined();
      expect(result.qrCodeImage).toBeDefined();
      expect(result.pinCode).toBeDefined();
    });

    it("throws HikCentralError on auth-error stub scenario", async () => {
      await expect(
        executeHikCentralCheckIn(baseParams, {
          mode: "stub",
          stubScenario: "auth-error",
        }),
      ).rejects.toThrow(HikCentralError);
    });

    it("throws HikCentralError on network-error stub scenario", async () => {
      await expect(
        executeHikCentralCheckIn(baseParams, {
          mode: "stub",
          stubScenario: "network-error",
        }),
      ).rejects.toThrow(HikCentralError);
    });
  });

  describe("live client mode", () => {
    it("calls POST /artemis/api/visitor/v1/registerment with correctly mapped payload", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {
          appointRecordId: "hc-reg-rec-999",
          visitorId: "hc-vis-888",
          qrCodeImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==",
          PINCode: "654321",
        },
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      const result = await executeHikCentralCheckIn(
        {
          ...baseParams,
          appointId: "orig-apt-123",
          facePhotoData: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        },
        { mode: "live", client: mockClient },
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/visitor/v1/registerment",
        expect.objectContaining({
          receptionistId: "emp-host-01",
          appointId: "orig-apt-123",
          visitStartTime: "2026-11-13T10:00:00+07:00",
          visitEndTime: "2026-11-13T14:00:00+07:00",
          visitPurposeType: 0,
        }),
        expect.anything(),
      );

      // Verify stripped data URI
      const wireBody = mockPost.mock.calls[0][1] as Record<string, unknown>;
      const visitorInfo = (
        wireBody.visitorInfoList as Array<{
          VisitorInfo: { faces: Array<{ faceData: string }> };
        }>
      )[0].VisitorInfo;
      expect(visitorInfo.faces[0].faceData).toBe("/9j/4AAQSkZJRg==");

      // Verify returned result
      expect(result.appointRecordId).toBe("hc-reg-rec-999");
      expect(result.visitorId).toBe("hc-vis-888");
      expect(result.pinCode).toBe("654321");
      expect(result.qrCodeImage).toBe("iVBORw0KGgoAAAANSUhEUg==");
    });

    it("translates hostId to wire receptionistId parameter", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {
          appointRecordId: "hc-reg-rec-100",
          visitorId: "hc-vis-100",
        },
      });

      const mockClient = {
        post: mockPost,
      } as unknown as HikCentralClient;

      await executeHikCentralCheckIn(
        {
          ...baseParams,
          hostId: "emp-host-99",
          receptionistId: undefined,
        },
        { mode: "live", client: mockClient },
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/visitor/v1/registerment",
        expect.objectContaining({
          receptionistId: "emp-host-99",
        }),
        expect.anything(),
      );
    });

    it("throws HikCentralError when upstream returns non-zero error code", async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          code: "0x00072010",
          msg: "Visitor reservation does not exist or expired",
          data: null,
        }),
      } as unknown as HikCentralClient;

      await expect(
        executeHikCentralCheckIn(baseParams, {
          mode: "live",
          client: mockClient,
        }),
      ).rejects.toThrow(HikCentralError);
    });

    it("throws HikCentralError when response data payload is malformed", async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          code: "0",
          msg: "Success",
          data: { invalid: true },
        }),
      } as unknown as HikCentralClient;

      await expect(
        executeHikCentralCheckIn(baseParams, {
          mode: "live",
          client: mockClient,
        }),
      ).rejects.toThrow("response missing or invalid 'data' payload");
    });
  });
});
