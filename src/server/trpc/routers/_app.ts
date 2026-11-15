import { router, createCallerFactory } from "../trpc";
import { visitorRouter } from "./visitor";
import { approvalRouter } from "./approval";
import { accessLevelRouter } from "./access-level";
import { monitoringRouter } from "./monitoring";
import { settingsRouter } from "./settings";

export const appRouter = router({
  visitor: visitorRouter,
  approval: approvalRouter,
  accessLevel: accessLevelRouter,
  monitoring: monitoringRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export type AppCaller = ReturnType<typeof createCaller>;
