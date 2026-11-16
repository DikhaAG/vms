import { beforeEach, describe, expect, it } from "vitest";
import {
  createGroupVisit,
  lookupReturningVisitor,
  setProfileSoftDelete,
  type GroupServiceDeps,
} from "./group-service";
import { InMemoryVmsRepository } from "./repository";
import type { GroupVisitInput } from "./group-contract";
import type { HikCentralAppointmentParams } from "./hikcentral-appointment-adapter";

describe("group-service", () => {
  let repository: InMemoryVmsRepository;
  let deps: GroupServiceDeps;

  const validGroupInput: GroupVisitInput = {
    hostId: "emp-host-01",
    hostName: "Budi Santoso",
    visitorGroupName: "Google DeepMind Research Delegation",
    scheduledStartTime: "2026-11-13T14:00:00+07:00",
    scheduledEndTime: "2026-11-13T17:00:00+07:00",
    visitReasonType: 3, // Meeting
    accessLevelIds: ["acc-jkt-lobby"],
    visitors: [
      {
        visitorFamilyName: "Hassabis",
        visitorGivenName: "Demis",
        visitorPhone: "+442071234567",
        visitorEmail: "demis@deepmind.com",
        certificateType: 414,
        certificateNo: "GBR12345678",
      },
      {
        visitorFamilyName: "Dean",
        visitorGivenName: "Jeff",
        visitorPhone: "+16501234567",
        visitorEmail: "jeff@google.com",
        certificateType: 414,
        certificateNo: "USA98765432",
      },
    ],
  };

  beforeEach(() => {
    repository = new InMemoryVmsRepository();
    deps = {
      repository,
      idGenerator: () => `test-id-${Math.random().toString(36).substring(2, 7)}`,
      now: () => new Date("2026-11-13T07:00:00.000Z"),
    };
  });

  describe("createGroupVisit", () => {
    it("creates a group visit and registers all visitors under shared groupId and visitorGroupName", async () => {
      const recordedAppointments: HikCentralAppointmentParams[] = [];

      deps.appointmentDispatcher = async (params) => {
        recordedAppointments.push(params);
        const idx = recordedAppointments.length;
        return {
          appointRecordId: `hc-rec-grp-${idx}`,
          visitorId: `hc-vis-grp-${idx}`,
          appointCode: `880${idx}`,
          qrCodeImage: "sample-qr-data",
        };
      };

      const result = await createGroupVisit(validGroupInput, deps);

      expect(result.groupId).toMatch(/^grp-/);
      expect(result.visitorGroupName).toBe(
        "Google DeepMind Research Delegation",
      );
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.memberVisits).toHaveLength(2);

      // Verify appointments sent to HikCentral
      expect(recordedAppointments).toHaveLength(2);
      expect(recordedAppointments[0].visitorGroupName).toBe(
        "Google DeepMind Research Delegation",
      );
      expect(recordedAppointments[0].visitorFamilyName).toBe("Hassabis");
      expect(recordedAppointments[1].visitorGroupName).toBe(
        "Google DeepMind Research Delegation",
      );
      expect(recordedAppointments[1].visitorFamilyName).toBe("Dean");

      // Verify visits saved in repository
      const groupVisits = await repository.listVisitsByGroup(result.groupId);
      expect(groupVisits).toHaveLength(2);
      expect(groupVisits[0].groupId).toBe(result.groupId);
      expect(groupVisits[0].visitorGroupName).toBe(
        "Google DeepMind Research Delegation",
      );
      expect(groupVisits[0].status).toBe("PENDING_APPROVAL");

      // Verify visitor profiles automatically created / updated for returning visitor auto-fill
      const demisProfile = await repository.findVisitorProfileByCertificate(
        "GBR12345678",
      );
      expect(demisProfile).toBeDefined();
      expect(demisProfile?.fullName).toBe("Demis Hassabis");
      expect(demisProfile?.email).toBe("demis@deepmind.com");
      expect(demisProfile?.isDeleted).toBe(false);

      const jeffProfile = await repository.findVisitorProfileByCertificate(
        "USA98765432",
      );
      expect(jeffProfile).toBeDefined();
      expect(jeffProfile?.fullName).toBe("Jeff Dean");
    });

    it("handles partial failures gracefully when one visitor fails at HikCentral", async () => {
      let callCount = 0;
      deps.appointmentDispatcher = async (params) => {
        callCount++;
        if (params.visitorFamilyName === "Dean") {
          throw new Error("HikCentral 0x00072005: invalid certificate number");
        }
        return {
          appointRecordId: `hc-rec-${callCount}`,
          visitorId: `hc-vis-${callCount}`,
          appointCode: "9911",
          qrCodeImage: "qr-data",
        };
      };

      const result = await createGroupVisit(validGroupInput, deps);

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.memberVisits).toHaveLength(2);

      const demisResult = result.memberVisits.find(
        (m) => m.visitorName === "Demis Hassabis",
      );
      expect(demisResult?.status).toBe("PENDING_APPROVAL");
      expect(demisResult?.visitId).toBeTruthy();

      const jeffResult = result.memberVisits.find(
        (m) => m.visitorName === "Jeff Dean",
      );
      expect(jeffResult?.status).toBe("REJECTED");
      expect(jeffResult?.error).toMatch(/invalid certificate/);
    });

    it("flags member as SECURITY_ESCALATED when visitor matched on monitoring list", async () => {
      deps.appointmentDispatcher = async () => {
        return {
          appointRecordId: "hc-rec-mon-1",
          visitorId: "hc-vis-mon-1",
          watchListInfo: [
            {
              ID: "wl-100",
              rejectNum: 1,
              type: "Deny Entry",
              remark: "Deny list entry",
            },
          ],
        };
      };

      const result = await createGroupVisit(
        {
          ...validGroupInput,
          visitors: [validGroupInput.visitors[0]],
        },
        deps,
      );

      expect(result.successCount).toBe(1);
      expect(result.memberVisits[0].status).toBe("SECURITY_ESCALATED");
    });

    it("schedules the group in the global system timezone without a facility", async () => {
      await repository.updateSettings({ timezone: "Asia/Makassar" });
      const recorded: HikCentralAppointmentParams[] = [];
      deps.appointmentDispatcher = async (params) => {
        recorded.push(params);
        return {
          appointRecordId: `apt-${recorded.length}`,
          visitorId: `vis-${recorded.length}`,
          appointCode: `CODE${recorded.length}`,
        };
      };

      const result = await createGroupVisit(
        {
          ...validGroupInput,
          scheduledStartTime: "2026-11-13T14:00:00",
          scheduledEndTime: "2026-11-13T17:00:00",
        },
        deps,
      );

      expect(result.successCount).toBe(2);
      expect(recorded[0].appointStartTime).toBe("2026-11-13T14:00:00+08:00");
      const visits = await Promise.all(
        result.memberVisits.map((m) => repository.getVisit(m.visitId)),
      );
      expect(visits[0]?.scheduledStartTimeUtc).toBe("2026-11-13T06:00:00.000Z");
      expect(visits[0]).not.toHaveProperty("facilityId");
    });

    it("falls back to the building's default access levels when none are selected", async () => {
      const recorded: HikCentralAppointmentParams[] = [];
      deps.appointmentDispatcher = async (params) => {
        recorded.push(params);
        return { appointRecordId: "apt-1", visitorId: "vis-1", appointCode: "C1" };
      };
      await repository.saveAccessLevel({
        id: "acc-default-lobby",
        name: "Lobby Default",
        description: "Default lobby access",
        doors: [],
        floors: [],
        timeScheduleId: 1,
        isDefault: true,
        createdAtUtc: "2026-01-01T00:00:00Z",
        updatedAtUtc: "2026-01-01T00:00:00Z",
      });
      const defaultIds = (await repository.listAccessLevels())
        .filter((al) => al.isDefault)
        .map((al) => al.id);

      const result = await createGroupVisit(
        { ...validGroupInput, accessLevelIds: undefined },
        deps,
      );

      expect(defaultIds).toContain("acc-default-lobby");
      expect(recorded[0].accessLevels?.map((al) => al.id)).toEqual(defaultIds);
      const visit = await repository.getVisit(result.memberVisits[0].visitId);
      expect(visit?.accessLevelIds).toEqual(defaultIds);
    });
  });

  describe("lookupReturningVisitor", () => {
    it("returns saved profile for one-click auto-fill if not soft-deleted", async () => {
      await repository.saveVisitorProfile({
        id: "prof-return-1",
        certificateType: 111,
        certificateNo: "3171012345670001",
        fullName: "Kenji Tanaka",
        familyName: "Tanaka",
        givenName: "Kenji",
        phone: "+628111222333",
        email: "kenji@example.com",
        facePhoto: "data:image/jpeg;base64,stored-photo",
        isDeleted: false,
        createdAtUtc: "2026-11-10T08:00:00.000Z",
        updatedAtUtc: "2026-11-10T08:00:00.000Z",
      });

      const profile = await lookupReturningVisitor("3171012345670001", deps);
      expect(profile).toBeDefined();
      expect(profile?.fullName).toBe("Kenji Tanaka");
      expect(profile?.facePhoto).toBe("data:image/jpeg;base64,stored-photo");
    });

    it("returns undefined when profile is soft-deleted for privacy compliance", async () => {
      await repository.saveVisitorProfile({
        id: "prof-return-2",
        certificateType: 111,
        certificateNo: "3171099999990002",
        fullName: "Budi Santoso",
        familyName: "Santoso",
        givenName: "Budi",
        isDeleted: true,
        createdAtUtc: "2026-11-10T08:00:00.000Z",
        updatedAtUtc: "2026-11-10T08:00:00.000Z",
      });

      const profile = await lookupReturningVisitor("3171099999990002", deps);
      expect(profile).toBeUndefined();
    });

    it("returns undefined when certificate number is unknown", async () => {
      const profile = await lookupReturningVisitor("UNKNOWN-CERT-NO", deps);
      expect(profile).toBeUndefined();
    });
  });

  describe("setProfileSoftDelete", () => {
    it("archives a visitor profile marking isDeleted true and setting reason", async () => {
      await repository.saveVisitorProfile({
        id: "prof-pdp-1",
        certificateType: 111,
        certificateNo: "3171088877760003",
        fullName: "Rina Wijaya",
        familyName: "Wijaya",
        givenName: "Rina",
        isDeleted: false,
        createdAtUtc: "2026-11-10T08:00:00.000Z",
        updatedAtUtc: "2026-11-10T08:00:00.000Z",
      });

      const updated = await setProfileSoftDelete(
        "prof-pdp-1",
        true,
        "User PDP right to be forgotten request",
        deps,
      );

      expect(updated.isDeleted).toBe(true);
      expect(updated.deletionReason).toBe(
        "User PDP right to be forgotten request",
      );
      expect(updated.deletedAtUtc).toBeDefined();

      // Verify no longer returned by lookup
      const lookup = await lookupReturningVisitor("3171088877760003", deps);
      expect(lookup).toBeUndefined();
    });

    it("restores a soft-deleted visitor profile", async () => {
      await repository.saveVisitorProfile({
        id: "prof-pdp-2",
        certificateType: 111,
        certificateNo: "3171088877760004",
        fullName: "Andi Pratama",
        familyName: "Pratama",
        givenName: "Andi",
        isDeleted: true,
        deletionReason: "Archived",
        createdAtUtc: "2026-11-10T08:00:00.000Z",
        updatedAtUtc: "2026-11-10T08:00:00.000Z",
      });

      const restored = await setProfileSoftDelete("prof-pdp-2", false, undefined, deps);

      expect(restored.isDeleted).toBe(false);
      expect(restored.deletionReason).toBeUndefined();

      const lookup = await lookupReturningVisitor("3171088877760004", deps);
      expect(lookup).toBeDefined();
      expect(lookup?.fullName).toBe("Andi Pratama");
    });
  });
});
