import { router, publicProcedure } from "../trpc";
import { updateSystemSettingsSchema } from "@/lib/vms/vms-contract";

export const settingsRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    return ctx.repository.getSettings();
  }),

  getSettings: publicProcedure.query(async ({ ctx }) => {
    return ctx.repository.getSettings();
  }),

  update: publicProcedure
    .input(updateSystemSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.repository.updateSettings(input);
    }),

  updateSettings: publicProcedure
    .input(updateSystemSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.repository.updateSettings(input);
    }),
});
