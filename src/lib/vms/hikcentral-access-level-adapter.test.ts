import { describe, expect, it, vi } from "vitest";
import {
  listVisitorPrivilegeGroups,
  createVisitorPrivilegeGroup,
  updateVisitorPrivilegeGroup,
  deleteVisitorPrivilegeGroup,
} from "./hikcentral-access-level-adapter";
import { HikCentralError, type HikCentralClient } from "../hikcentral/client";

describe("hikcentral-access-level-adapter", () => {
  describe("stub mode", () => {
    it("lists visitor privilege groups in stub mode", async () => {
      const result = await listVisitorPrivilegeGroups({ mode: "stub" });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].privilegeGroupId).toBeDefined();
      expect(result[0].privilegeGroupName).toBeDefined();
    });

    it("creates visitor privilege group in stub mode", async () => {
      const result = await createVisitorPrivilegeGroup(
        {
          privilegeGroupId: "acc-custom-1",
          privilegeGroupName: "Custom Floor Access",
          description: "Testing floor access",
          isDefault: 0,
          timeScheduleIndexCode: "2",
        },
        { mode: "stub" },
      );
      expect(result.privilegeGroupId).toBe("acc-custom-1");
      expect(result.privilegeGroupName).toBe("Custom Floor Access");
    });

    it("updates visitor privilege group in stub mode", async () => {
      const result = await updateVisitorPrivilegeGroup(
        {
          privilegeGroupId: "acc-custom-1",
          privilegeGroupName: "Custom Floor Access Updated",
          description: "Updated description",
          isDefault: 1,
          timeScheduleIndexCode: "1",
        },
        { mode: "stub" },
      );
      expect(result.success).toBe(true);
    });

    it("deletes visitor privilege group in stub mode", async () => {
      const result = await deleteVisitorPrivilegeGroup("acc-custom-1", {
        mode: "stub",
      });
      expect(result.success).toBe(true);
    });

    it("handles error scenarios in stub mode", async () => {
      await expect(
        listVisitorPrivilegeGroups({
          mode: "stub",
          stubScenario: "auth-error",
        }),
      ).rejects.toThrow(HikCentralError);

      await expect(
        createVisitorPrivilegeGroup(
          {
            privilegeGroupId: "acc-1",
            privilegeGroupName: "Test",
            timeScheduleIndexCode: "1",
          },
          { mode: "stub", stubScenario: "network-error" },
        ),
      ).rejects.toThrow(HikCentralError);
    });
  });

  describe("live mode with mock client transport", () => {
    it("calls POST /artemis/api/acs/v1/privilege/group with type=2", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {
          total: 1,
          pageNo: 1,
          pageSize: 50,
          list: [
            {
              privilegeGroupId: "pg-001",
              privilegeGroupName: "Lobby Gate",
              description: "Main lobby",
              isDefault: 1,
              timeSchedule: {
                indexCode: "2",
                name: "Workday",
              },
            },
          ],
        },
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;
      const groups = await listVisitorPrivilegeGroups({
        mode: "live",
        client: mockClient,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group",
        {
          pageNo: 1,
          pageSize: 50,
          type: 2,
        },
        expect.any(Object),
      );
      expect(groups).toHaveLength(1);
      expect(groups[0].privilegeGroupId).toBe("pg-001");
      expect(groups[0].privilegeGroupName).toBe("Lobby Gate");
    });

    it("calls POST /artemis/api/acs/v1/privilege/group/add with formatted list", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {
          list: [
            {
              privilegeGroupId: "pg-new",
              privilegeGroupName: "New Level",
            },
          ],
        },
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;
      const created = await createVisitorPrivilegeGroup(
        {
          privilegeGroupId: "pg-new",
          privilegeGroupName: "New Level",
          description: "New access",
          isDefault: 0,
          timeScheduleIndexCode: "1",
        },
        { mode: "live", client: mockClient },
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/add",
        {
          type: 2,
          list: [
            {
              privilegeGroupId: "pg-new",
              privilegeGroupName: "New Level",
              description: "New access",
              isDefault: 0,
              timeSchedule: {
                indexCode: "1",
              },
            },
          ],
        },
        expect.any(Object),
      );
      expect(created.privilegeGroupId).toBe("pg-new");
    });

    it("calls POST /artemis/api/acs/v1/privilege/group/update", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;
      const res = await updateVisitorPrivilegeGroup(
        {
          privilegeGroupId: "pg-new",
          privilegeGroupName: "Renamed Level",
          description: "Updated",
          isDefault: 1,
          timeScheduleIndexCode: "2",
        },
        { mode: "live", client: mockClient },
      );

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/update",
        {
          type: 2,
          data: {
            privilegeGroupId: "pg-new",
            privilegeGroupName: "Renamed Level",
            description: "Updated",
            isDefault: 1,
            timeSchedule: {
              indexCode: "2",
            },
          },
        },
        expect.any(Object),
      );
      expect(res.success).toBe(true);
    });

    it("calls POST /artemis/api/acs/v1/privilege/group/delete", async () => {
      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;
      const res = await deleteVisitorPrivilegeGroup("pg-old", {
        mode: "live",
        client: mockClient,
      });

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/acs/v1/privilege/group/delete",
        {
          type: 2,
          list: [
            {
              privilegeGroupId: "pg-old",
            },
          ],
        },
        expect.any(Object),
      );
      expect(res.success).toBe(true);
    });
  });
});
