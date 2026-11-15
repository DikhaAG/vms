import { describe, expect, it, vi } from "vitest";
import {
  isDoorListResponseData,
  isPerimeterDoor,
  deduceDoorAccessType,
  syncHikCentralDoors,
} from "./hikcentral-door-adapter";
import { InMemoryVmsRepository } from "./repository";
import type { HikCentralClient } from "../hikcentral/client";

describe("hikcentral-door-adapter", () => {
  describe("isDoorListResponseData", () => {
    it("validates expected shape", () => {
      expect(isDoorListResponseData({ total: 10, list: [] })).toBe(true);
      expect(isDoorListResponseData({})).toBe(true);
      expect(isDoorListResponseData(null)).toBe(false);
      expect(isDoorListResponseData("string")).toBe(false);
      expect(isDoorListResponseData({ list: "not-an-array" })).toBe(false);
    });
  });

  describe("isPerimeterDoor", () => {
    it("identifies turnstiles and gates as perimeter doors", () => {
      expect(isPerimeterDoor("Main Turnstile Lobby A")).toBe(true);
      expect(isPerimeterDoor("Speedgate Entrance North")).toBe(true);
      expect(isPerimeterDoor("Barrier Gate 01")).toBe(true);
      expect(isPerimeterDoor("Gerbang Barat")).toBe(true);
      expect(isPerimeterDoor("Pintu Masuk Utama")).toBe(true);
    });

    it("identifies interior doors as non-perimeter", () => {
      expect(isPerimeterDoor("Ruang Rapat Merah 01")).toBe(false);
      expect(isPerimeterDoor("Server Room 2B")).toBe(false);
      expect(isPerimeterDoor("Finance Office")).toBe(false);
      expect(isPerimeterDoor(undefined)).toBe(false);
      expect(isPerimeterDoor("")).toBe(false);
    });
  });

  describe("deduceDoorAccessType", () => {
    it("returns SINGLE_DIRECTION_IN when doorOutState is -1", () => {
      expect(deduceDoorAccessType(-1)).toBe("SINGLE_DIRECTION_IN");
    });

    it("returns DUAL_DIRECTION when doorOutState is valid or 0/1/2/3/4", () => {
      expect(deduceDoorAccessType(0)).toBe("DUAL_DIRECTION");
      expect(deduceDoorAccessType(1)).toBe("DUAL_DIRECTION");
      expect(deduceDoorAccessType(undefined)).toBe("DUAL_DIRECTION");
    });
  });

  describe("syncHikCentralDoors", () => {
    it("calls POST /artemis/api/resource/v1/acsDoor/acsDoorList and saves doors to repository", async () => {
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
              doorIndexCode: "door-turnstile-01",
              acsDevIndexCode: "dev-01",
              regionIndexCode: "reg-lobby",
              doorNo: "1",
              doorName: "Turnstile Lobby Ground Floor",
              doorState: 1,
              doorOutState: 1,
            },
            {
              doorIndexCode: "door-server-02",
              acsDevIndexCode: "dev-02",
              regionIndexCode: "reg-data-center",
              doorNo: "2",
              doorName: "Server Room Primary",
              doorState: 1,
              doorOutState: -1,
            },
          ],
        },
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralDoors({
        client: mockClient,
        repository: repo,
        facilityId: "fac-hq",
        userId: "operator-01",
      });

      expect(result.ok).toBe(true);
      expect(result.totalSynced).toBe(2);
      expect(result.doors).toHaveLength(2);

      expect(mockPost).toHaveBeenCalledWith(
        "/artemis/api/resource/v1/acsDoor/acsDoorList",
        {
          pageNo: 1,
          pageSize: 500,
        },
        {
          userId: "operator-01",
        },
      );

      const savedDoors = await repo.listDoors("fac-hq");
      expect(savedDoors).toHaveLength(2);

      const turnstile = savedDoors.find((d) => d.doorIndexCode === "door-turnstile-01");
      expect(turnstile).toBeDefined();
      expect(turnstile?.doorName).toBe("Turnstile Lobby Ground Floor");
      expect(turnstile?.isPerimeter).toBe(true);
      expect(turnstile?.accessType).toBe("DUAL_DIRECTION");
      expect(turnstile?.regionIndexCode).toBe("reg-lobby");
      expect(turnstile?.channelNo).toBe("1");
      expect(turnstile?.doorState).toBe(1);
      expect(turnstile?.isOnline).toBe(true);
      expect(turnstile?.facilityId).toBe("fac-hq");

      const serverRoom = savedDoors.find((d) => d.doorIndexCode === "door-server-02");
      expect(serverRoom).toBeDefined();
      expect(serverRoom?.doorName).toBe("Server Room Primary");
      expect(serverRoom?.isPerimeter).toBe(false);
      expect(serverRoom?.accessType).toBe("SINGLE_DIRECTION_IN");
      expect(serverRoom?.regionIndexCode).toBe("reg-data-center");
      expect(serverRoom?.channelNo).toBe("2");
      expect(serverRoom?.doorState).toBe(1);
      expect(serverRoom?.isOnline).toBe(true);
    });

    it("synchronizes doors without synthetic facilityId and marks offline doors accurately", async () => {
      const repo = new InMemoryVmsRepository();

      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: {
          total: 2,
          list: [
            {
              doorIndexCode: "door-flat-01",
              regionIndexCode: "region-north",
              doorNo: "10",
              doorName: "North Perimeter Gate",
              doorState: 1,
              doorOutState: 1,
            },
            {
              doorIndexCode: "door-offline-02",
              regionIndexCode: "region-south",
              doorNo: "11",
              doorName: "South Barrier Gate",
              doorState: 4, // offline
              doorOutState: 4,
            },
          ],
        },
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralDoors({
        client: mockClient,
        repository: repo,
        // no facilityId passed
      });

      expect(result.ok).toBe(true);
      expect(result.totalSynced).toBe(2);

      const savedDoors = await repo.listDoors();
      expect(savedDoors).toHaveLength(2);

      const gate = savedDoors.find((d) => d.doorIndexCode === "door-flat-01");
      expect(gate).toBeDefined();
      expect(gate?.facilityId).toBeUndefined(); // no synthetic facility ID
      expect(gate?.regionIndexCode).toBe("region-north");
      expect(gate?.channelNo).toBe("10");
      expect(gate?.doorState).toBe(1);
      expect(gate?.isOnline).toBe(true);

      const offlineDoor = savedDoors.find((d) => d.doorIndexCode === "door-offline-02");
      expect(offlineDoor).toBeDefined();
      expect(offlineDoor?.facilityId).toBeUndefined();
      expect(offlineDoor?.regionIndexCode).toBe("region-south");
      expect(offlineDoor?.doorState).toBe(4);
      expect(offlineDoor?.isOnline).toBe(false); // correctly deduced as offline
    });

    it("handles multi-page pagination when total exceeds pageSize", async () => {
      const repo = new InMemoryVmsRepository();

      const mockPost = vi
        .fn()
        .mockResolvedValueOnce({
          code: "0",
          msg: "Success",
          data: {
            total: 3,
            pageNo: 1,
            pageSize: 2,
            list: [
              { doorIndexCode: "door-page1-01", doorName: "Door Page 1 A" },
              { doorIndexCode: "door-page1-02", doorName: "Door Page 1 B" },
            ],
          },
        })
        .mockResolvedValueOnce({
          code: "0",
          msg: "Success",
          data: {
            total: 3,
            pageNo: 2,
            pageSize: 2,
            list: [
              { doorIndexCode: "door-page2-03", doorName: "Door Page 2 C" },
            ],
          },
        });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralDoors({
        client: mockClient,
        repository: repo,
        pageSize: 2,
      });

      expect(result.ok).toBe(true);
      expect(result.totalSynced).toBe(3);
      expect(mockPost).toHaveBeenCalledTimes(2);

      const savedDoors = await repo.listDoors();
      expect(savedDoors).toHaveLength(3);
    });

    it("handles network failure and unreachable hardware gracefully", async () => {
      const repo = new InMemoryVmsRepository();

      const mockPost = vi.fn().mockRejectedValue(new Error("connect ETIMEDOUT 10.0.0.1:443"));
      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralDoors({
        client: mockClient,
        repository: repo,
      });

      expect(result.ok).toBe(false);
      expect(result.totalSynced).toBe(0);
      expect(result.error?.kind).toBe("upstream");
      expect(result.error?.message).toContain("ETIMEDOUT");
    });

    it("handles non-zero error code from HikCentral", async () => {
      const repo = new InMemoryVmsRepository();

      const mockPost = vi.fn().mockResolvedValue({
        code: "0x00072002",
        msg: "appKey does not exist",
        data: null,
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralDoors({
        client: mockClient,
        repository: repo,
      });

      expect(result.ok).toBe(false);
      expect(result.totalSynced).toBe(0);
      expect(result.error?.kind).toBe("upstream");
      expect(result.error?.code).toBe("0x00072002");
      expect(result.error?.message).toContain("appKey does not exist");
    });

    it("handles malformed response data", async () => {
      const repo = new InMemoryVmsRepository();

      const mockPost = vi.fn().mockResolvedValue({
        code: "0",
        msg: "Success",
        data: "not-an-object",
      });

      const mockClient = { post: mockPost } as unknown as HikCentralClient;

      const result = await syncHikCentralDoors({
        client: mockClient,
        repository: repo,
      });

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("upstream");
      expect(result.error?.message).toContain("malformed");
    });
  });
});

