import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET as searchGET } from "./search/route";
import { POST as walkInPOST } from "./walk-in/route";
import { POST as checkInPOST } from "./[visitId]/route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { DEFAULT_SYSTEM_SETTINGS, type Visit } from "@/lib/vms/vms-contract";
import type { AccessLevel } from "@/lib/vms/access-level-contract";

describe("Reception Check-In HTTP API Routes (Ticket 05)", () => {
    const buildingAccessLevel: AccessLevel = {
        id: "acc-route-lobby",
        name: "Lobby & Turnstiles Global",
        description: "Building perimeter access",
        doors: ["door-turnstile-1"],
        floors: ["1F"],
        timeScheduleId: 2,
        isDefault: true,
    };

    const approvedVisit: Visit = {
        id: "vis-route-approved-1",
        hostId: "emp-host-01",
        hostName: "Budi Santoso",
        visitorFamilyName: "Kusuma",
        visitorGivenName: "Dian",
        visitorPhone: "+628120000111",
        certificateType: 111,
        certificateNo: "3171099988877766",
        visitReasonType: 0,
        scheduledStartTimeUtc: "2026-11-20T02:00:00.000Z",
        scheduledEndTimeUtc: "2026-11-20T05:00:00.000Z",
        scheduledStartTimeFacility: "2026-11-20T09:00:00+07:00",
        scheduledEndTimeFacility: "2026-11-20T12:00:00+07:00",
        status: "APPROVED",
        hikCentral: {
            appointRecordId: "hc-apt-route-1",
            visitorId: "hc-vis-route-1",
            appointCode: "5678",
        },
        accessLevelIds: ["acc-route-lobby"],
        createdAtUtc: "2026-11-20T01:00:00.000Z",
        updatedAtUtc: "2026-11-20T01:00:00.000Z",
    };

    beforeEach(async () => {
        await defaultVmsRepository.updateSettings({
            timezone: "Asia/Jakarta",
        });
        await defaultVmsRepository.saveAccessLevel(buildingAccessLevel);
        await defaultVmsRepository.saveVisit(approvedVisit);
    });

    afterEach(async () => {
        await defaultVmsRepository.updateSettings({
            timezone: DEFAULT_SYSTEM_SETTINGS.timezone,
        });
        await defaultVmsRepository.deleteAccessLevel(buildingAccessLevel.id);
    });

    it("GET /api/vms/check-in/search searches visits globally without facilityId", async () => {
        const req = new Request(
            "http://localhost/api/vms/check-in/search?q=Dian",
            { method: "GET" },
        );
        const res = await searchGET(req);
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data.some((v: Visit) => v.id === "vis-route-approved-1")).toBe(
            true,
        );
    });

    it("POST /api/vms/check-in/walk-in registers unscheduled visitor without facilityId and activates building credentials", async () => {
        const req = new Request("http://localhost/api/vms/check-in/walk-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                hostId: "emp-host-01",
                hostName: "Budi Santoso",
                visitorGivenName: "Hendra",
                visitorFamilyName: "Wijaya",
                visitorPhone: "+628123456700",
                certificateType: 111,
                certificateNo: "3171011122233344",
                visitReasonType: 3,
                receptionistUserId: "rec-01",
                receptionistName: "Dewi Frontdesk",
                verificationMethod: "id_card",
                mode: "stub",
                stubScenario: "success",
            }),
        });

        const res = await walkInPOST(req);
        expect(res.status).toBe(201);

        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.visit.facilityId).toBeUndefined();
        expect(json.data.visit.status).toBe("CHECKED_IN");
        expect(json.data.visit.accessLevelIds).toContain("acc-route-lobby");
        expect(json.data.pass.visitorName).toBe("Hendra Wijaya");
        expect(json.data.pass.accessLevelNames).toEqual([
            "Lobby & Turnstiles Global",
        ]);
    });

    it("POST /api/vms/check-in/[visitId] verifies approved visit and issues visitor pass", async () => {
        const req = new Request(
            "http://localhost/api/vms/check-in/vis-route-approved-1",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    receptionistUserId: "rec-01",
                    receptionistName: "Dewi Frontdesk",
                    verificationMethod: "id_card",
                    mode: "stub",
                    stubScenario: "success",
                }),
            },
        );

        const res = await checkInPOST(req, {
            params: Promise.resolve({ visitId: "vis-route-approved-1" }),
        });
        expect(res.status).toBe(200);

        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.data.visit.status).toBe("CHECKED_IN");
        expect(json.data.pass.visitorName).toBe("Dian Kusuma");
        expect(json.data.pass.accessLevelNames).toEqual([
            "Lobby & Turnstiles Global",
        ]);
    });
});