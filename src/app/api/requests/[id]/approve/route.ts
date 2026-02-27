import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyApprovalResult } from "@/lib/notifications";
import { approvalActionSchema } from "@/lib/validators";

// POST /api/requests/[id]/approve — approve or reject
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "MDM_MANAGER", "MDM_ANALYST"].includes(role)) {
    return NextResponse.json({ error: "Not authorized to approve" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = approvalActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { action, comment } = parsed.data;

  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["NEW", "PENDING_REVIEW", "PENDING_APPROVAL", "IN_PROGRESS"].includes(cr.status)) {
    return NextResponse.json({ error: `Cannot ${action} request in status ${cr.status}` }, { status: 400 });
  }

  const isApprove = action === "approve";
  const newStatus = isApprove ? "APPROVED" : "REJECTED";

  // Create approval record
  const approval = await prisma.approval.create({
    data: {
      changeRequestId: id,
      approverId: session.user.id,
      status: isApprove ? "APPROVED" : "REJECTED",
      comment: comment || null,
      decidedAt: new Date(),
    },
  });

  // Update CR status
  await prisma.changeRequest.update({
    where: { id },
    data: {
      status: newStatus,
      completedAt: isApprove ? new Date() : undefined,
    },
  });

  // Add comment if provided
  if (comment) {
    await prisma.comment.create({
      data: {
        changeRequestId: id,
        authorId: session.user.id,
        content: `[${isApprove ? "Approved" : "Rejected"}] ${comment}`,
        isInternal: true,
      },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      entityType: "ChangeRequest",
      entityId: id,
      action: isApprove ? "APPROVE" : "REJECT",
      changes: { previousStatus: cr.status, newStatus, comment },
      userId: session.user.id,
    },
  });

  // Notify requestor
  if (cr.requestorId) {
    await notifyApprovalResult({
      requestId: id,
      requestNumber: cr.requestNumber,
      title: cr.title,
      requestorId: cr.requestorId,
      decision: isApprove ? "APPROVED" : "REJECTED",
      approverName: session.user.name || "Unknown",
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, status: newStatus, approvalId: approval.id });
}
