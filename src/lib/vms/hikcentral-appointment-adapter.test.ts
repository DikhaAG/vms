import { describe, expect, it } from "vitest";
import type { HikCentralClient, HikCentralResponse } from "../hikcentral/client";
import {
  dispatchHikCentralAppointment,
  type HikCentralAppointmentParams,
} from "./hikcentral-appointment-adapter";

describe("dispatchHikCentralAppointment", () => {
  const baseParams: HikCentralAppointmentParams = {
    userId: "admin",
    hostId: "emp-42",
    appointStartTime: "2026-11-13T16:00:00+07:00",
    appointEndTime: "2026-11-13T18:00:00+07:00",
    visitReasonType: 0,
    visitorFamilyName: "Tanaka",
    visitorGivenName: "Kenji",
    visitorPhone: "+628111222333",
    visitorEmail: "kenji@example.com",
    certificateType: 111,
    certificateNo: "3171012345670001",
  };

  describe("stub mode", () => {
    it("returns appointment record, visitor ID, and QR pass on success scenario", async () => {
      const result = await dispatchHikCentralAppointment(baseParams, {
        mode: "stub",
        stubScenario: "success",
      });

      expect(result.appointRecordId).toMatch(/^apt-rec-/);
      expect(result.visitorId).toMatch(/^vis-/);
      expect(result.appointCode).toBeDefined();
      expect(result.qrCodeImage).toBeDefined();
    });

    it("returns watchListInfo when stubScenario is monitoring-list-flagged", async () => {
      const result = await dispatchHikCentralAppointment(baseParams, {
        mode: "stub",
        stubScenario: "monitoring-list-flagged",
      });

      expect(result.appointRecordId).toMatch(/^apt-rec-/);
      expect(result.watchListInfo).toBeDefined();
      expect(Array.isArray(result.watchListInfo)).toBe(true);
      expect(result.watchListInfo).toHaveLength(1);
    });

    it("throws appropriate error on auth-error stub scenario", async () => {
      await expect(
        dispatchHikCentralAppointment(baseParams, {
          mode: "stub",
          stubScenario: "auth-error",
        }),
      ).rejects.toThrow(/auth|appKey|0x00072002/i);
    });

    it("throws network error on network-error stub scenario", async () => {
      await expect(
        dispatchHikCentralAppointment(baseParams, {
          mode: "stub",
          stubScenario: "network-error",
        }),
      ).rejects.toThrow(/network|ECONNREFUSED/i);
    });
  });

  describe("live mode via mock HikCentralClient", () => {
    it("maps hostId to receptionistId and wraps visitor in visitorInfoList", async () => {
      let recordedPath = "";
      let recordedBody: unknown;
      let recordedOptions: unknown;

      const mockClient: HikCentralClient = {
        async post<TResponse, TBody = unknown>(
          path: string,
          body?: TBody,
          options?: unknown,
        ): Promise<HikCentralResponse<TResponse>> {
          recordedPath = path;
          recordedBody = body;
          recordedOptions = options;
          return {
            code: "0",
            msg: "Success",
            data: {
              appointRecordId: "hik-record-999",
              visitorId: "hik-visitor-888",
              appointCode: "1234",
              qrCodeImage: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            } as TResponse,
          };
        },
      };

      const result = await dispatchHikCentralAppointment(baseParams, {
        mode: "live",
        client: mockClient,
      });

      expect(recordedPath).toBe("/artemis/api/visitor/v2/appointment");
      expect(recordedOptions).toEqual({ userId: "admin" });
      expect(result.appointRecordId).toBe("hik-record-999");
      expect(result.visitorId).toBe("hik-visitor-888");
      expect(result.appointCode).toBe("1234");
      expect(result.qrCodeImage).toBeDefined();

      const body = recordedBody as Record<string, unknown>;
      // Translates hostId to receptionistId at boundary
      expect(body.receptionistId).toBe("emp-42");
      expect(body.appointStartTime).toBe("2026-11-13T16:00:00+07:00");
      expect(body.appointEndTime).toBe("2026-11-13T18:00:00+07:00");
      expect(body.visitReasonType).toBe(0);

      const visitorList = body.visitorInfoList as Array<{
        VisitorInfo: Record<string, unknown>;
      }>;
      expect(visitorList).toHaveLength(1);
      expect(visitorList[0].VisitorInfo.visitorFamilyName).toBe("Tanaka");
      expect(visitorList[0].VisitorInfo.visitorGivenName).toBe("Kenji");
      expect(visitorList[0].VisitorInfo.phoneNo).toBe("+628111222333");
      expect(visitorList[0].VisitorInfo.certificateNo).toBe("3171012345670001");
      expect(visitorList[0].VisitorInfo.certificateType).toBe(111);
      expect(visitorList[0].VisitorInfo.faces).toBeUndefined();
    });

    it("attaches normalized faces array to VisitorInfo when facePhotoData is supplied", async () => {
      let recordedBody: unknown;

      const mockClient: HikCentralClient = {
        async post<TResponse, TBody = unknown>(
          _path: string,
          body?: TBody,
        ): Promise<HikCentralResponse<TResponse>> {
          recordedBody = body;
          return {
            code: "0",
            msg: "Success",
            data: {
              appointRecordId: "hik-rec-face-1",
              visitorId: "hik-vis-face-1",
            } as TResponse,
          };
        },
      };

      const rawFaceBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBD";
      const faceDataUri = `data:image/jpeg;base64,${rawFaceBase64}`;

      await dispatchHikCentralAppointment(
        {
          ...baseParams,
          facePhotoData: faceDataUri,
        },
        {
          mode: "live",
          client: mockClient,
        },
      );

      const body = recordedBody as {
        visitorInfoList: Array<{
          VisitorInfo: {
            faces?: Array<{ faceData: string }>;
          };
        }>;
      };

      expect(body.visitorInfoList[0].VisitorInfo.faces).toEqual([
        {
          faceData: rawFaceBase64,
        },
      ]);
    });

    it("attaches accessLevelList and sets qrCodeValidNum on wirePayload", async () => {
      let recordedBody: unknown;

      const mockClient: HikCentralClient = {
        async post<TResponse, TBody = unknown>(
          _path: string,
          body?: TBody,
        ): Promise<HikCentralResponse<TResponse>> {
          recordedBody = body;
          return {
            code: "0",
            msg: "Success",
            data: {
              appointRecordId: "hik-rec-acc-1",
              visitorId: "hik-vis-acc-1",
            } as TResponse,
          };
        },
      };

      await dispatchHikCentralAppointment(
        {
          ...baseParams,
          accessLevels: [
            { id: "acc-jkt-lobby", name: "Lobby Turnstiles" },
            { id: "acc-jkt-exec", name: "Executive Floor 3" },
          ],
          qrCodeValidNum: 3,
        },
        {
          mode: "live",
          client: mockClient,
        },
      );

      const body = recordedBody as {
        accessInfo?: {
          accessLevelList?: Array<{
            accessLevel: {
              id: string | number;
              baseInfo?: {
                name?: string;
              };
            };
          }>;
        };
        visitorInfoList: Array<{
          VisitorInfo: {
            accessInfo?: {
              qrCodeValidNum?: number;
            };
          };
        }>;
      };

      expect(body.accessInfo?.accessLevelList).toEqual([
        {
          accessLevel: {
            id: "acc-jkt-lobby",
            baseInfo: {
              name: "Lobby Turnstiles",
            },
          },
        },
        {
          accessLevel: {
            id: "acc-jkt-exec",
            baseInfo: {
              name: "Executive Floor 3",
            },
          },
        },
      ]);
      expect(body.visitorInfoList[0].VisitorInfo.accessInfo?.qrCodeValidNum).toBe(3);
    });

    it("throws if HikCentral response data is missing even when code is 0", async () => {
      const mockClient: HikCentralClient = {
        async post<TResponse>(): Promise<HikCentralResponse<TResponse>> {
          return {
            code: "0",
            msg: "Success",
            data: null as unknown as TResponse,
          };
        },
      };

      await expect(
        dispatchHikCentralAppointment(baseParams, {
          mode: "live",
          client: mockClient,
        }),
      ).rejects.toThrow(/missing or invalid 'data'/i);
    });
  });
});
