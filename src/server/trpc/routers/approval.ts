import { z } from "zod";
import { router, publicProcedure, TRPCError } from "../trpc";
import type { Context } from "../context";
import { approverUserSchema, type ApproverUser } from "@/lib/vms/approval-contract";
import {
  listPendingApprovals,
  decideApproval,
} from "@/lib/vms/approval-service";

function resolveApprover(ctx: Context, customApprover?: ApproverUser): ApproverUser {
  return (
    customApprover ?? {
      id: ctx.session?.userId ?? "usr-approver-01",
      name: ctx.session?.userName ?? "Approver",
      role: ctx.session?.userRole ?? "Approver",
    }
  );
}

async function executeApprovalDecision(
  ctx: Context,
  params: {
    visitId: string;
    action: "approve" | "reject";
    comment?: string;
    approver?: ApproverUser;
  },
) {
  const approver = resolveApprover(ctx, params.approver);
  const result = await decideApproval(
    params.visitId,
    {
      action: params.action,
      comment: params.comment,
    },
    approver,
    {
      repository: ctx.repository,
      enableHikCentralSync: ctx.enableHikCentralSync,
    },
  );

  if (!result.ok || !result.visit || !result.approvalRecord) {
    let code: "BAD_REQUEST" | "NOT_FOUND" | "BAD_GATEWAY" | "INTERNAL_SERVER_ERROR" =
      "INTERNAL_SERVER_ERROR";

    if (result.error?.status === 404 || result.error?.kind === "not_found") {
      code = "NOT_FOUND";
    } else if (result.error?.status === 400 || result.error?.kind === "validation") {
      code = "BAD_REQUEST";
    } else if (result.error?.status === 502 || result.error?.kind === "upstream") {
      code = "BAD_GATEWAY";
    }

    throw new TRPCError({
      code,
      message: result.error?.message ?? `${params.action} decision failed`,
    });
  }

  return {
    visit: result.visit,
    approvalRecord: result.approvalRecord,
  };
}

export const approvalRouter = router({
  listPending: publicProcedure.query(async ({ ctx }) => {
    return listPendingApprovals({ repository: ctx.repository });
  }),

  approve: publicProcedure
    .input(
      z.object({
        visitId: z.string().trim().min(1, "Visit ID is required"),
        comment: z.string().optional(),
        approver: approverUserSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return executeApprovalDecision(ctx, {
        visitId: input.visitId,
        action: "approve",
        comment: input.comment,
        approver: input.approver,
      });
    }),

  reject: publicProcedure
    .input(
      z.object({
        visitId: z.string().trim().min(1, "Visit ID is required"),
        comment: z.string().trim().min(1, "Alasan penolakan wajib diisi"),
        approver: approverUserSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return executeApprovalDecision(ctx, {
        visitId: input.visitId,
        action: "reject",
        comment: input.comment,
        approver: input.approver,
      });
    }),
});
