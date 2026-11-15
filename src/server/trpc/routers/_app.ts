import { router, createCallerFactory } from "../trpc";
import { visitorRouter } from "./visitor";
import { approvalRouter } from "./approval";
import { accessLevelRouter } from "./access-level";
import { monitoringRouter } from "./monitoring";

export const appRouter = router({
  visitor: visitorRouter,
  approval: approvalRouter,
  accessLevel: accessLevelRouter,
  monitoring: monitoringRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
export type AppCaller = ReturnType<typeof createCaller>;
