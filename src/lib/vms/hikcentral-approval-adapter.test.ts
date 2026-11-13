import { describe, it, expect } from "vitest";
import {
  parseMonitoringListFlag,
  syncApprovalToHikCentral,
  type SyncApprovalParams,
} from "./hikcentral-approval-adapter";
import type { HikCentralClient } from "../hikcentral/client";

describe("HikCentral Approval & Monitoring List Adapter", () => {
  describe("parseMonitoringListFlag", () => {
    it("returns undefined when watchListInfo is absent or null", () => {
      expect(parseMonitoringListFlag(null)).toBeUndefined();
      expect(parseMonitoringListFlag({})).toBeUndefined();
      expect(parseMonitoringListFlag({ appointRecordId: "rec-1" })).toBeUndefined();
    });

    it("returns undefined when watchListInfo is an empty array", () => {
      expect(parseMonitoringListFlag({ watchListInfo: [] })).toBeUndefined();
    });

    it("extracts monitoring list flag and translates upstream fields", () => {
      const rawPayload = {
        appointRecordId: "rec-999",
        visitorId: "vis-999",
        watchListInfo: [
          {
            ID: "wl-001",
            enableRegister: 0,
            rejectNum: 2,
            visitorType: 1,
            type: "Deny Entry",
            remark: "High security risk alert",
            visitorTypeName: "Banned Individual",
            identiFicationType: 111,
            identiFiyCode: "ID-BL-9999",
          },
        ],
      };

      const flag = parseMonitoringListFlag(rawPayload);
      expect(flag).toBeDefined();
      expect(flag?.isFlagged).toBe(true);
      expect(flag?.reason).toBe("High security risk alert");
      expect(flag?.flaggedAtUtc).toBeDefined();
      expect(flag?.matches).toHaveLength(1);

      const match = flag?.matches?.[0];
      expect(match?.id).toBe("wl-001");
      expect(match?.enableRegister).toBe(0);
      expect(match?.rejectNum).toBe(2);
      expect(match?.type).toBe("Deny Entry");
      // ACL field translation: identiFiyCode -> certificateNo
      expect(match?.certificateNo).toBe("ID-BL-9999");
      // ACL field translation: identiFicationType -> identificationType
      expect(match?.identificationType).toBe(111);
    });

    it("handles multiple matches and defaults reason if remark is empty", () => {
      const rawPayload = {
        watchListInfo: [
          {
            ID: "wl-002",
            enableRegister: 0,
            type: "Security Alert",
          },
        ],
      };

      const flag = parseMonitoringListFlag(rawPayload);
      expect(flag?.isFlagged).toBe(true);
      expect(flag?.reason).toBe(
        "Visitor identity matched HikCentral monitoring list.",
      );
    });
  });

  describe("syncApprovalToHikCentral", () => {
    it("syncs approval decision in stub mode with success", async () => {
      const params: SyncApprovalParams = {
        userId: "admin-user",
        operateType: 0, // approve
        approvalOpinion: "Authorized by Department Manager",
        approvalFlowCode: 1001,
      };

      const result = await syncApprovalToHikCentral(params, { mode: "stub" });
      expect(result.success).toBe(true);
      expect(result.synced).toBe(true);
    });

    it("syncs rejection decision in stub mode with success", async () => {
      const params: SyncApprovalParams = {
        userId: "security-officer",
        operateType: 1, // reject
        approvalOpinion: "Flagged on watchlist, entry prohibited",
      };

      const result = await syncApprovalToHikCentral(params, { mode: "stub" });
      expect(result.success).toBe(true);
      expect(result.synced).toBe(true);
    });

    it("dispatches live HTTP request with Artemis envelope and userId header", async () => {
      let capturedPath = "";
      let capturedBody: unknown = null;
      let capturedHeaders: Record<string, unknown> | undefined;

      const mockClient = {
        post: async <T>(
          path: string,
          body: unknown,
          headers?: Record<string, unknown>,
        ) => {
          capturedPath = path;
          capturedBody = body;
          capturedHeaders = headers;
          return {
            code: "0",
            msg: "success",
            data: [
              {
                errorCode: 0,
                visitorID: 101,
                approvalFlowCode: "flow-101",
                visitorName: "Budi Aditya",
              },
            ],
          } as unknown as T;
        },
      } as unknown as HikCentralClient;

      const params: SyncApprovalParams = {
        userId: "sec-user-1",
        operateType: 0,
        approvalOpinion: "All identity checks cleared",
        approvalFlowCode: 555,
      };

      const result = await syncApprovalToHikCentral(params, {
        mode: "live",
        client: mockClient,
      });

      expect(result.success).toBe(true);
      expect(result.synced).toBe(true);
      expect(capturedPath).toBe(
        "/artemis/api/visitor/v1/visitorapprovalflow/status",
      );
      expect(capturedHeaders?.userId).toBe("sec-user-1");

      const body = capturedBody as Record<string, unknown>;
      expect(body).toBeDefined();
      const visitor = body.visitor as Record<string, unknown>;
      expect(visitor.operateType).toBe(0);
      expect(visitor.approvalOpinion).toBe("All identity checks cleared");
    });

    it("gracefully catches upstream failure and reports synced: false without crashing", async () => {
      const failingClient = {
        post: async () => {
          throw new Error("HikCentral gateway timeout");
        },
      } as unknown as HikCentralClient;

      const params: SyncApprovalParams = {
        operateType: 0,
        approvalOpinion: "Approved",
      };

      const result = await syncApprovalToHikCentral(params, {
        mode: "live",
        client: failingClient,
      });

      expect(result.success).toBe(false);
      expect(result.synced).toBe(false);
      expect(result.error).toBe("HikCentral gateway timeout");
    });
  });
});
