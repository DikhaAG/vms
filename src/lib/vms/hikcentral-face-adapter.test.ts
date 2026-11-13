import { describe, expect, it } from "vitest";
import type { HikCentralClient, HikCentralResponse } from "../hikcentral/client";
import {
  checkFaceQuality,
  retryCredentialSync,
  getCredentialSyncStatus,
} from "./hikcentral-face-adapter";

describe("HikCentral Face & Credential Sync Adapter", () => {
  describe("checkFaceQuality", () => {
    describe("stub mode", () => {
      it("returns valid when quality check succeeds", async () => {
        const result = await checkFaceQuality(
          {
            faceData: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            acsDevIndexCode: "minmoe-dev-01",
          },
          { mode: "stub", stubScenario: "success" },
        );
        expect(result.valid).toBe(true);
        expect(result.checked).toBe(true);
      });

      it("returns invalid when quality check fails in stub scenario", async () => {
        const result = await checkFaceQuality(
          {
            faceData: "/9j/4AAQSkZJRg==",
            acsDevIndexCode: "minmoe-dev-01",
          },
          { mode: "stub", stubScenario: "face-quality-failed" },
        );
        expect(result.valid).toBe(false);
        expect(result.checked).toBe(true);
        expect(result.message).toMatch(/angle|resolution|requirements/i);
      });

      it("returns fallback safe when no acsDevIndexCode is provided", async () => {
        const result = await checkFaceQuality(
          {
            faceData: "/9j/4AAQSkZJRg==",
          },
          { mode: "stub" },
        );
        expect(result.valid).toBe(true);
        expect(result.checked).toBe(false);
        expect(result.message).toMatch(/no.*MinMoe.*configured/i);
      });
    });

    describe("live mode with mock HikCentralClient", () => {
      it("dispatches POST /artemis/api/acs/v1/faceCheck with stripped base64 and device index", async () => {
        let recordedPath = "";
        let recordedBody: unknown;

        const mockClient: HikCentralClient = {
          async post<TResponse, TBody = unknown>(
            path: string,
            body?: TBody,
          ): Promise<HikCentralResponse<TResponse>> {
            recordedPath = path;
            recordedBody = body;
            return {
              code: "0",
              msg: "Success",
              data: "" as unknown as TResponse,
            };
          },
        };

        const result = await checkFaceQuality(
          {
            faceData: "data:image/jpeg;base64,4AAQSkZJRg==",
            acsDevIndexCode: "dev-gate-01",
            userId: "admin",
          },
          { mode: "live", client: mockClient },
        );

        expect(recordedPath).toBe("/artemis/api/acs/v1/faceCheck");
        expect(recordedBody).toEqual({
          faceData: "4AAQSkZJRg==",
          acsDevIndexCode: "dev-gate-01",
        });
        expect(result.valid).toBe(true);
        expect(result.checked).toBe(true);
      });

      it("handles non-zero error response as invalid face quality", async () => {
        const mockClient: HikCentralClient = {
          async post<TResponse>(): Promise<HikCentralResponse<TResponse>> {
            return {
              code: "0x00072041",
              msg: "Face image is too blurry for facial recognition.",
              data: "" as unknown as TResponse,
            };
          },
        };

        const result = await checkFaceQuality(
          {
            faceData: "4AAQSkZJRg==",
            acsDevIndexCode: "dev-gate-01",
          },
          { mode: "live", client: mockClient },
        );

        expect(result.valid).toBe(false);
        expect(result.code).toBe("0x00072041");
        expect(result.message).toMatch(/blurry/i);
      });
    });
  });

  describe("retryCredentialSync", () => {
    describe("stub mode", () => {
      it("returns success on standard scenario", async () => {
        const result = await retryCredentialSync(
          { personIds: "vis-12345" },
          { mode: "stub", stubScenario: "success" },
        );
        expect(result.success).toBe(true);
        expect(result.message).toMatch(/reapplication triggered/i);
      });

      it("throws network error on network-error scenario", async () => {
        await expect(
          retryCredentialSync(
            { personIds: "vis-12345" },
            { mode: "stub", stubScenario: "network-error" },
          ),
        ).rejects.toThrow(/network|ECONNREFUSED/i);
      });
    });

    describe("live mode with mock HikCentralClient", () => {
      it("dispatches POST /artemis/api/visitor/v1/auth/reapplication with ImmediateDownload: 1", async () => {
        let recordedPath = "";
        let recordedBody: unknown;

        const mockClient: HikCentralClient = {
          async post<TResponse, TBody = unknown>(
            path: string,
            body?: TBody,
          ): Promise<HikCentralResponse<TResponse>> {
            recordedPath = path;
            recordedBody = body;
            return {
              code: "0",
              msg: "ok",
              data: "" as unknown as TResponse,
            };
          },
        };

        const result = await retryCredentialSync(
          {
            personIds: "vis-777",
            userId: "operator-01",
          },
          { mode: "live", client: mockClient },
        );

        expect(recordedPath).toBe(
          "/artemis/api/visitor/v1/auth/reapplication",
        );
        expect(recordedBody).toEqual({
          orderId: "1",
          ImmediateDownload: 1,
          personIds: "vis-777",
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("getCredentialSyncStatus", () => {
    describe("stub mode", () => {
      it("returns Applied on success stub scenario", async () => {
        const report = await getCredentialSyncStatus(
          { visitorId: "vis-123" },
          { mode: "stub", stubScenario: "success" },
        );
        expect(report.overallStatus).toBe("Applied");
        expect(report.visitorId).toBe("vis-123");
      });

      it("returns Failed on sync-failed stub scenario", async () => {
        const report = await getCredentialSyncStatus(
          { visitorId: "vis-123" },
          { mode: "stub", stubScenario: "sync-failed" },
        );
        expect(report.overallStatus).toBe("Failed");
      });

      it("returns Syncing on sync-pending stub scenario", async () => {
        const report = await getCredentialSyncStatus(
          { visitorId: "vis-123" },
          { mode: "stub", stubScenario: "sync-pending" },
        );
        expect(report.overallStatus).toBe("Syncing");
      });
    });

    describe("live mode with mock HikCentralClient", () => {
      it("parses ElementDetailList to determine overall status", async () => {
        let recordedPath = "";
        let recordedBody: unknown;

        const mockClient: HikCentralClient = {
          async post<TResponse, TBody = unknown>(
            path: string,
            body?: TBody,
          ): Promise<HikCentralResponse<TResponse>> {
            recordedPath = path;
            recordedBody = body;
            return {
              code: "0",
              msg: "Success",
              data: {
                ElementDetailList: {
                  ElementDetail: [
                    {
                      BaseInfo: {
                        Name: "Main Entrance Turnstile",
                        ElementType: 6,
                        Network: 1,
                      },
                      ElementStatus: {
                        Status: "0",
                        ErrorCode: "0",
                      },
                      CertificateStatusList: {
                        CertificateStatus: [
                          {
                            Type: 2, // Face picture
                            Status: "0", // Applied
                          },
                        ],
                      },
                      ID: "elem-turnstile-1",
                    },
                  ],
                },
              } as unknown as TResponse,
            };
          },
        };

        const report = await getCredentialSyncStatus(
          { visitorId: "vis-999" },
          { mode: "live", client: mockClient },
        );

        expect(recordedPath).toBe(
          "/artemis/api/visitor/v1/person/ID/elementDownloadDetail",
        );
        expect(recordedBody).toEqual({ id: "vis-999" });
        expect(report.overallStatus).toBe("Applied");
        expect(report.elements).toHaveLength(1);
        expect(report.elements[0].elementName).toBe("Main Entrance Turnstile");
        expect(report.elements[0].status).toBe("0");
      });

      it("detects Failed status when any element status is 2", async () => {
        const mockClient: HikCentralClient = {
          async post<TResponse>(): Promise<HikCentralResponse<TResponse>> {
            return {
              code: "0",
              msg: "Success",
              data: {
                ElementDetailList: {
                  ElementDetail: [
                    {
                      BaseInfo: {
                        Name: "Barrier Gate East",
                        ElementType: 6,
                        Network: 0,
                      },
                      ElementStatus: {
                        Status: "2", // Failed
                        ErrorCode: "0x00051010",
                      },
                      ID: "elem-barrier-1",
                    },
                  ],
                },
              } as unknown as TResponse,
            };
          },
        };

        const report = await getCredentialSyncStatus(
          { visitorId: "vis-failed" },
          { mode: "live", client: mockClient },
        );

        expect(report.overallStatus).toBe("Failed");
      });
    });
  });
});
