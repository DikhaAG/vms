import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc";
import { syncHikCentralDoors } from "@/lib/vms/hikcentral-door-adapter";

export const doorsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.repository.listDoors();
  }),

  get: publicProcedure
    .input(
      z.object({
        doorIndexCode: z.string().trim().min(1, "Door index code is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const door = await ctx.repository.getDoor(input.doorIndexCode);
      if (!door) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Door with code ${input.doorIndexCode} not found`,
        });
      }
      return door;
    }),

  syncDoors: publicProcedure
    .input(
      z
        .object({
          pageNo: z.number().int().positive().optional(),
          pageSize: z.number().int().positive().optional(),
          userId: z.string().optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await syncHikCentralDoors({
        repository: ctx.repository,
        pageNo: input?.pageNo,
        pageSize: input?.pageSize,
        userId: input?.userId,
      });

      if (!result.ok) {
        if (result.error?.kind === "config") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error.message,
          });
        }
        if (result.error?.kind === "validation") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error.message,
          });
        }
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: result.error?.message || "Door synchronization failed",
        });
      }

      return result;
    }),
});
