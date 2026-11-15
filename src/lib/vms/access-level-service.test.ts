import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository, TEST_FIXTURE_ACCESS_LEVELS } from "./repository";
import {
  listAccessLevelsService,
  getAccessLevelService,
  createAccessLevelService,
  updateAccessLevelService,
  deleteAccessLevelService,
} from "./access-level-service";

describe("access-level-service", () => {
  let repository: InMemoryVmsRepository;

  beforeEach(async () => {
    repository = new InMemoryVmsRepository();
    await repository.saveAccessLevels(TEST_FIXTURE_ACCESS_LEVELS);
  });

  describe("listAccessLevelsService", () => {
    it("starts with empty access levels on a fresh repository without fixtures", async () => {
      const emptyRepo = new InMemoryVmsRepository();
      const levels = await listAccessLevelsService({}, { repository: emptyRepo });
      expect(levels).toEqual([]);
    });

    it("returns pre-seeded access levels filtered by facility", async () => {
      const jakartaLevels = await listAccessLevelsService(
        { facilityId: "fac-jakarta" },
        { repository },
      );
      expect(jakartaLevels.length).toBeGreaterThanOrEqual(2);
      expect(jakartaLevels.every((l) => l.facilityId === "fac-jakarta")).toBe(true);
    });

    it("returns all access levels when no facility filter is provided", async () => {
      const allLevels = await listAccessLevelsService({}, { repository });
      expect(allLevels.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getAccessLevelService", () => {
    it("retrieves an existing access level by id", async () => {
      const level = await getAccessLevelService("acc-jkt-lobby", { repository });
      expect(level).toBeDefined();
      expect(level?.name).toContain("Lobby");
    });

    it("returns undefined for non-existent id", async () => {
      const level = await getAccessLevelService("non-existent-id", { repository });
      expect(level).toBeUndefined();
    });
  });

  describe("createAccessLevelService", () => {
    it("validates and creates a flat access level without facilityId", async () => {
      const result = await createAccessLevelService(
        {
          name: "Perimeter Gates Flat",
          description: "All ground turnstiles",
          doors: ["Turnstile A", "Turnstile B"],
          floors: ["1F"],
          timeScheduleId: 2,
          isDefault: true,
        },
        { repository, mode: "stub" },
      );

      expect(result.ok).toBe(true);
      expect(result.accessLevel).toBeDefined();
      expect(result.accessLevel?.id).toMatch(/^acc-/);
      expect(result.accessLevel?.facilityId).toBeUndefined();
      expect(result.accessLevel?.name).toBe("Perimeter Gates Flat");

      const saved = await repository.getAccessLevel(result.accessLevel!.id);
      expect(saved).toBeDefined();
      expect(saved?.doors).toEqual(["Turnstile A", "Turnstile B"]);
    });

    it("validates and creates a new dynamic access level", async () => {
      const result = await createAccessLevelService(
        {
          facilityId: "fac-jakarta",
          name: "Server Room B",
          description: "Server hardware room",
          doors: ["Door SR-01"],
          floors: ["B1"],
          timeScheduleId: 1,
          isDefault: false,
        },
        { repository, mode: "stub" },
      );

      expect(result.ok).toBe(true);
      expect(result.accessLevel).toBeDefined();
      expect(result.accessLevel?.id).toMatch(/^acc-/);
      expect(result.accessLevel?.name).toBe("Server Room B");

      const saved = await repository.getAccessLevel(result.accessLevel!.id);
      expect(saved).toBeDefined();
      expect(saved?.doors).toEqual(["Door SR-01"]);
    });

    it("returns validation error for invalid payload", async () => {
      const result = await createAccessLevelService(
        {
          facilityId: "fac-jakarta",
          name: "", // Invalid empty name
          doors: [], // Invalid empty doors
          timeScheduleId: 99, // Invalid schedule
        },
        { repository, mode: "stub" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("validation");
      expect(result.error?.fieldErrors).toBeDefined();
      expect(result.error?.fieldErrors?.name).toBeDefined();
      expect(result.error?.fieldErrors?.doors).toBeDefined();
    });

    it("returns not_found if facility does not exist", async () => {
      const result = await createAccessLevelService(
        {
          facilityId: "fac-non-existent",
          name: "Test Room",
          doors: ["Door 1"],
          timeScheduleId: 1,
        },
        { repository, mode: "stub" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("not_found");
    });
  });

  describe("updateAccessLevelService", () => {
    it("updates existing access level attributes", async () => {
      const result = await updateAccessLevelService(
        "acc-jkt-lobby",
        {
          name: "Main Lobby & VIP Turnstiles",
          doors: ["Lobby SpeedGate A", "Lobby SpeedGate B", "VIP Turnstile"],
        },
        { repository, mode: "stub" },
      );

      expect(result.ok).toBe(true);
      expect(result.accessLevel?.name).toBe("Main Lobby & VIP Turnstiles");

      const updated = await repository.getAccessLevel("acc-jkt-lobby");
      expect(updated?.doors).toHaveLength(3);
    });

    it("returns not_found for updating non-existent access level", async () => {
      const result = await updateAccessLevelService(
        "acc-does-not-exist",
        { name: "New Name" },
        { repository, mode: "stub" },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("not_found");
    });
  });

  describe("deleteAccessLevelService", () => {
    it("deletes an existing access level from repository", async () => {
      const result = await deleteAccessLevelService("acc-jkt-dc", {
        repository,
        mode: "stub",
      });
      expect(result.ok).toBe(true);

      const deleted = await repository.getAccessLevel("acc-jkt-dc");
      expect(deleted).toBeUndefined();
    });

    it("returns not_found for deleting non-existent access level", async () => {
      const result = await deleteAccessLevelService("acc-unknown", {
        repository,
        mode: "stub",
      });
      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("not_found");
    });
  });
});
