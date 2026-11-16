import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVmsRepository } from "./repository";
import {
  createInvitation,
  getPublicInvitationMetadata,
  validateInvitationToken,
} from "./invitation-service";
import type { CreateInvitationInput } from "./invitation-contract";

describe("invitation-service", () => {
  let repository: InMemoryVmsRepository;
  const mockNow = new Date("2026-11-13T08:00:00.000Z");

  beforeEach(() => {
    repository = new InMemoryVmsRepository();
  });

  const baseInput: CreateInvitationInput = {
    hostName: "Budi Santoso",
    hostId: "emp-001",
    visitReasonType: 3,
    visitReasonDetail: "Strategic Partnership Discussion",
    scheduledStartTime: "2026-11-20T09:00",
    scheduledEndTime: "2026-11-20T11:00",
  };

  describe("createInvitation", () => {
    it("creates a draft visit and secure invitation token", async () => {
      const result = await createInvitation(baseInput, {
        repository,
        now: () => mockNow,
      });

      expect(result.ok).toBe(true);
      expect(result.invitation).toBeDefined();
      expect(result.invitation?.token).toMatch(/^[a-f0-9]{32,}$/);
      expect(result.invitation?.isConsumed).toBe(false);
      expect(result.inviteUrl).toBe(`/invite/${result.invitation?.token}`);

      expect(result.visit).toBeDefined();
      expect(result.visit?.status).toBe("DRAFT");
      expect(result.visit?.hostName).toBe("Budi Santoso");
      expect(result.visit?.scheduledStartTimeFacility).toBe(
        "2026-11-20T09:00:00+07:00",
      );
      expect(result.visit?.scheduledEndTimeFacility).toBe(
        "2026-11-20T11:00:00+07:00",
      );

      // Verify stored in repository
      const storedToken = await repository.getInvitationToken(
        result.invitation!.token,
      );
      expect(storedToken).toBeDefined();
      expect(storedToken?.visitId).toBe(result.visit?.id);

      const storedVisit = await repository.getVisit(result.visit!.id);
      expect(storedVisit).toBeDefined();
      expect(storedVisit?.status).toBe("DRAFT");
    });

    it("supports optional prefilled visitor details from host", async () => {
      const result = await createInvitation(
        {
          ...baseInput,
          visitorFamilyName: "Pratama",
          visitorGivenName: "Rian",
          visitorEmail: "rian.pratama@example.com",
        },
        { repository, now: () => mockNow },
      );

      expect(result.ok).toBe(true);
      expect(result.visit?.visitorFamilyName).toBe("Pratama");
      expect(result.visit?.visitorGivenName).toBe("Rian");
      expect(result.visit?.visitorEmail).toBe("rian.pratama@example.com");
    });

    it("rejects invalid input schema", async () => {
      const result = await createInvitation(
        { ...baseInput, scheduledEndTime: "invalid-time" },
        { repository, now: () => mockNow },
      );

      expect(result.ok).toBe(false);
      expect(result.error?.kind).toBe("validation");
    });
  });

  describe("validateInvitationToken", () => {
    it("validates an active, unconsumed token", async () => {
      const created = await createInvitation(baseInput, {
        repository,
        now: () => mockNow,
      });

      const validation = await validateInvitationToken(
        created.invitation!.token,
        {
          repository,
          now: () => mockNow,
        },
      );

      expect(validation.valid).toBe(true);
      expect(validation.status).toBe("valid");
      expect(validation.visit?.id).toBe(created.visit?.id);
      expect(validation.site).toEqual({
        name: "Gedung Utama",
        timezone: "Asia/Jakarta",
      });
    });

    it("returns invalid status for non-existent token", async () => {
      const validation = await validateInvitationToken("non-existent-token", {
        repository,
        now: () => mockNow,
      });

      expect(validation.valid).toBe(false);
      expect(validation.status).toBe("invalid");
      if (!validation.valid) {
        expect(validation.error).toContain("not found");
      }
    });

    it("returns consumed status for already-consumed token", async () => {
      const created = await createInvitation(baseInput, {
        repository,
        now: () => mockNow,
      });

      await repository.consumeInvitationToken(created.invitation!.token);

      const validation = await validateInvitationToken(
        created.invitation!.token,
        {
          repository,
          now: () => mockNow,
        },
      );

      expect(validation.valid).toBe(false);
      expect(validation.status).toBe("consumed");
      if (!validation.valid) {
        expect(validation.error).toContain("already been used");
      }
    });

    it("returns expired status when now is past token expiry or visit end time", async () => {
      const created = await createInvitation(baseInput, {
        repository,
        now: () => mockNow,
      });

      // Scheduled end is 2026-11-20T11:00 Jakarta (2026-11-20T04:00Z)
      // Check validation on 2026-11-21 (after visit ended)
      const futureNow = new Date("2026-11-21T00:00:00.000Z");

      const validation = await validateInvitationToken(
        created.invitation!.token,
        {
          repository,
          now: () => futureNow,
        },
      );

      expect(validation.valid).toBe(false);
      expect(validation.status).toBe("expired");
      if (!validation.valid) {
        expect(validation.error).toContain("expired");
      }
    });
  });

  describe("getPublicInvitationMetadata", () => {
    it("returns public invitation metadata without sensitive internal secrets", async () => {
      const created = await createInvitation(
        {
          ...baseInput,
          visitorFamilyName: "Aditya",
          visitorGivenName: "Bambang",
        },
        { repository, now: () => mockNow },
      );

      const result = await getPublicInvitationMetadata(
        created.invitation!.token,
        {
          repository,
          now: () => mockNow,
        },
      );

      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.site).toEqual({
        name: "Gedung Utama",
        timezone: "Asia/Jakarta",
      });
      expect(result.data).not.toHaveProperty("facility");
      expect(result.data?.host?.name).toBe("Budi Santoso");
      expect(result.data?.visitReasonLabel).toBe("Meeting");
      expect(result.data?.visitReasonDetail).toBe(
        "Strategic Partnership Discussion",
      );
      expect(result.data?.scheduledStartTimeFacility).toBe(
        "2026-11-20T09:00:00+07:00",
      );
      expect(result.data?.prefilledVisitor?.familyName).toBe("Aditya");
      expect(result.data?.prefilledVisitor?.givenName).toBe("Bambang");
    });

    it("returns error for invalid token", async () => {
      const result = await getPublicInvitationMetadata("invalid-token", {
        repository,
        now: () => mockNow,
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe("invalid");
      expect(result.httpStatus).toBe(404);
    });

    it("returns 410 for consumed token", async () => {
      const created = await createInvitation(baseInput, {
        repository,
        now: () => mockNow,
      });

      await repository.consumeInvitationToken(created.invitation!.token);

      const result = await getPublicInvitationMetadata(
        created.invitation!.token,
        {
          repository,
          now: () => mockNow,
        },
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe("consumed");
      expect(result.httpStatus).toBe(410);
    });
  });
});
