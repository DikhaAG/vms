import { router, publicProcedure, TRPCError } from "../trpc";
import { createAccessLevelSchema } from "@/lib/vms/access-level-contract";
import {
  listAccessLevelsService,
  createAccessLevelService,
} from "@/lib/vms/access-level-service";

export const accessLevelRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return listAccessLevelsService({ repository: ctx.repository });
  }),

  create: publicProcedure
    .input(createAccessLevelSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await createAccessLevelService(input, {
        repository: ctx.repository,
      });

      if (!result.ok || !result.accessLevel) {
        let code: "BAD_REQUEST" | "NOT_FOUND" | "BAD_GATEWAY" | "INTERNAL_SERVER_ERROR" =
          "INTERNAL_SERVER_ERROR";

        if (result.error?.kind === "validation") {
          code = "BAD_REQUEST";
        } else if (result.error?.kind === "not_found") {
          code = "NOT_FOUND";
        } else if (result.error?.kind === "upstream" || result.error?.status === 502) {
          code = "BAD_GATEWAY";
        }

        throw new TRPCError({
          code,
          message: result.error?.message ?? "Failed to create access level",
        });
      }

      return result.accessLevel;
    }),
});
