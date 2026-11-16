import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc";
import { createPreRegistrationSchema } from "@/lib/vms/vms-contract";
import {
  createPreRegistration,
  cancelVisit,
} from "@/lib/vms/pre-registration-service";

function mapErrorToTrpcCode(
  kind?: string,
  status?: number,
): "BAD_REQUEST" | "NOT_FOUND" | "BAD_GATEWAY" | "INTERNAL_SERVER_ERROR" {
  if (status === 404 || kind === "not_found") return "NOT_FOUND";
  if (status === 400 || kind === "validation" || kind === "invalid_state")
    return "BAD_REQUEST";
  if (status === 502 || kind === "upstream") return "BAD_GATEWAY";
  return "INTERNAL_SERVER_ERROR";
}

export const visitorRouter = router({
  search: publicProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          includeDeleted: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.repository.listVisitorProfiles({
        query: input?.query?.trim() || undefined,
        includeDeleted: input?.includeDeleted ?? false,
      });
    }),

  preRegister: publicProcedure
    .input(createPreRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await createPreRegistration(input, {
        repository: ctx.repository,
      });

      if (!result.ok) {
        const code = mapErrorToTrpcCode(
          result.error?.kind,
          result.error?.status,
        );
        throw new TRPCError({
          code,
          message: result.error?.message ?? "Pre-registration failed",
        });
      }

      return result;
    }),

  cancelPreRegistration: publicProcedure
    .input(
      z.object({
        visitId: z.string().trim().min(1, "Visit ID is required"),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await cancelVisit(input.visitId, input.reason, {
        repository: ctx.repository,
      });

      if (!result.ok) {
        const code = mapErrorToTrpcCode(
          result.error?.kind,
          result.error?.status,
        );
        throw new TRPCError({
          code,
          message: result.error?.message ?? "Failed to cancel visit",
        });
      }

      return result;
    }),
});
