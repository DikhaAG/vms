import { NextResponse } from "next/server";
import { decideApproval } from "@/lib/vms/approval-service";
import type {
  ApprovalAction,
  ApproverUser,
} from "@/lib/vms/approval-contract";

export async function POST(
  request: Request,
  context: { params: Promise<{ visitId: string }> },
) {
  const { visitId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Request payload must be valid JSON.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "validation",
          message: "Request payload must be an object.",
          status: 400,
        },
      },
      { status: 400 },
    );
  }

  const record = body as Record<string, unknown>;
  const approver: ApproverUser = {
    id:
      typeof record.approverId === "string" && record.approverId.trim()
        ? record.approverId.trim()
        : "usr-approver-01",
    name:
      typeof record.approverName === "string" && record.approverName.trim()
        ? record.approverName.trim()
        : "Approver",
    role:
      typeof record.approverRole === "string" && record.approverRole.trim()
        ? record.approverRole.trim()
        : "Approver",
  };

  const result = await decideApproval(
    visitId,
    {
      action: record.action as ApprovalAction,
      comment: typeof record.comment === "string" ? record.comment : undefined,
    },
    approver,
  );

  if (!result.ok) {
    const status = result.error?.status ?? 500;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
      },
      { status },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        visit: result.visit,
        approvalRecord: result.approvalRecord,
      },
    },
    { status: 200 },
  );
}
