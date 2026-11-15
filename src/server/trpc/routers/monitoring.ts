import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc";
import { grantEmergencyAccessInputSchema } from "@/lib/vms/checkout-contract";
import { ActiveMonitoringService } from "@/lib/vms/active-monitoring-service";
import { HikCentralError } from "@/lib/hikcentral/client";

export const monitoringRouter = router({
  listActive: publicProcedure
    .input(
      z
        .object({
          facilityId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const service = new ActiveMonitoringService(ctx.repository);
      const activeVisits = await service.getActiveVisits(input?.facilityId);

      const totalOnPremise = activeVisits.length;
      const overstayAlerts = activeVisits.filter((v) => v.isOverstay).length;
      const quotaWarnings = activeVisits.filter(
        (v) =>
          v.isQuotaExceeded ||
          (v.tapQuotaMode === "limited" &&
            v.maxTaps > 0 &&
            v.tapCount >= v.maxTaps - 1),
      ).length;
      const normal = Math.max(0, totalOnPremise - overstayAlerts);

      return {
        activeVisits,
        summary: {
          totalOnPremise,
          normal,
          overstayAlerts,
          quotaWarnings,
        },
      };
    }),

  fetchDoorTelemetry: publicProcedure
    .input(
      z
        .object({
          facilityId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.repository.listDoors(input?.facilityId);
    }),

  emergencyDoorUnlock: publicProcedure
    .input(
      grantEmergencyAccessInputSchema.and(
        z.object({
          visitId: z.string().trim().min(1, "Visit ID is required"),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const service = new ActiveMonitoringService(ctx.repository);

      try {
        const result = await service.grantEmergencyAccess(
          input.visitId,
          input,
          {
            mode: input.mode,
            stubScenario: input.stubScenario,
          },
        );

        return {
          grant: result.grant,
          visit: result.visit,
          message: "Emergency access granted successfully.",
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }

        if (error instanceof Error && error.message.includes("is in status")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }

        if (error instanceof HikCentralError) {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: error.message,
          });
        }

        const message =
          error instanceof Error ? error.message : "Internal error";
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
});
