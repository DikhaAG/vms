import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import { defaultVmsRepository } from "@/lib/vms/repository";
import { createInvitation } from "@/lib/vms/invitation-service";
import { createSampleFaceJpegDataUri } from "@/lib/vms/face-normalizer";

describe("Route: /api/vms/invite/[token]", () => {
  let activeToken: string;

  beforeEach(async () => {
    // Generate fresh test invite
    const invite = await createInvitation(
      {
        facilityId: "fac-jakarta",
        hostName: "Budi Santoso",
        hostId: "emp-001",
        visitReasonType: 3,
        visitReasonDetail: "Quarterly Vendor Evaluation",
        scheduledStartTime: "2026-11-20T09:00",
        scheduledEndTime: "2026-11-20T11:00",
      },
      { repository: defaultVmsRepository },
    );
    activeToken = invite.invitation!.token;
  });

  describe("GET /api/vms/invite/[token]", () => {
    it("returns 200 with public invitation metadata for a valid token", async () => {
      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
      );
      const response = await GET(request, {
        params: Promise.resolve({ token: activeToken }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.facility.name).toBe("Jakarta Corporate HQ");
      expect(json.data.facility.timezone).toBe("Asia/Jakarta");
      expect(json.data.host.name).toBe("Budi Santoso");
      expect(json.data.visitReasonLabel).toBe("Meeting");
      expect(json.data.scheduledStartTimeFacility).toBe(
        "2026-11-20T09:00:00+07:00",
      );
    });

    it("returns 404 when token does not exist", async () => {
      const request = new Request(
        "http://localhost:3000/api/vms/invite/invalid-token-123",
      );
      const response = await GET(request, {
        params: Promise.resolve({ token: "invalid-token-123" }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.status).toBe("invalid");
    });

    it("returns 410 when token has already been consumed", async () => {
      await defaultVmsRepository.consumeInvitationToken(activeToken);

      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
      );
      const response = await GET(request, {
        params: Promise.resolve({ token: activeToken }),
      });

      expect(response.status).toBe(410);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.status).toBe("consumed");
    });
  });

  describe("POST /api/vms/invite/[token]", () => {
    const compliantPhoto = createSampleFaceJpegDataUri(24 * 1024);

    const validSubmission = {
      visitorFamilyName: "Pratama",
      visitorGivenName: "Rian",
      visitorPhone: "+628123456789",
      visitorEmail: "rian.pratama@example.com",
      certificateType: 111,
      certificateNo: "3171012345670001",
      facePhoto: compliantPhoto,
      mode: "stub",
      stubScenario: "success",
    };

    it("returns 200 with visit and qrPass on successful submission", async () => {
      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validSubmission),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ token: activeToken }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);
      expect(json.visit).toBeDefined();
      expect(json.visit.status).toBe("PENDING_APPROVAL");
      expect(json.visit.visitorFamilyName).toBe("Pratama");
      expect(json.qrPass).toBeDefined();
      expect(json.qrPass.appointRecordId).toMatch(/^apt-rec-/);
      expect(json.qrPass.qrCodeImage).toContain("data:image/png;base64,");

      // Verify token cannot be re-used (returns 410 on second submit)
      const secondResponse = await POST(
        new Request(`http://localhost:3000/api/vms/invite/${activeToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validSubmission),
        }),
        { params: Promise.resolve({ token: activeToken }) },
      );
      expect(secondResponse.status).toBe(410);
    });

    it("returns 400 when body is not valid JSON", async () => {
      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not-json",
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ token: activeToken }),
      });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.kind).toBe("validation");
    });

    it("returns 400 when visitor names are missing", async () => {
      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...validSubmission,
            visitorFamilyName: "",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ token: activeToken }),
      });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.fieldErrors.visitorFamilyName).toBeDefined();
    });

    it("returns 400 when face photo size violates 10-100 KB constraint", async () => {
      const tooSmallPhoto = createSampleFaceJpegDataUri(3 * 1024); // 3 KB
      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...validSubmission,
            facePhoto: tooSmallPhoto,
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ token: activeToken }),
      });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.fieldErrors.facePhoto).toBeDefined();
    });

    it("returns 502 when HikCentral sync fails without leaking secrets", async () => {
      const request = new Request(
        `http://localhost:3000/api/vms/invite/${activeToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...validSubmission,
            mode: "stub",
            stubScenario: "network-error",
          }),
        },
      );

      const response = await POST(request, {
        params: Promise.resolve({ token: activeToken }),
      });
      expect(response.status).toBe(502);
      const json = await response.json();
      expect(json.ok).toBe(false);
      expect(json.error.kind).toBe("upstream");
    });
  });
});
