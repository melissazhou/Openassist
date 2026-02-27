import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateChangeRequestSchema } from "@/lib/validators";
import { notifyStatusChange, notifyAssignment } from "@/lib/notifications";

// GET /api/requests/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    include: {
      requestor: { select: { id: true, displayName: true, username: true } },
      assignedTo: { select: { id: true, displayName: true, username: true } },
      comments: {
        include: { author: { select: { id: true, displayName: true } } },
        orderBy: { createdAt: "desc" },
      },
      approvals: {
        include: { approver: { select: { id: true, displayName: true } } },
        orderBy: { step: "asc" },
      },
      attachments: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cr);
}

// PATCH /api/requests/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.changeRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: any = { ...parsed.data };
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  if (data.status === "COMPLETED") data.completedAt = new Date();

  const cr = await prisma.changeRequest.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      entityType: "ChangeRequest",
      entityId: id,
      action: "UPDATE",
      changes: body,
      userId: session.user.id,
    },
  });

  // Notify on status change
  if (parsed.data.status && parsed.data.status !== existing.status) {
    await notifyStatusChange({
      requestId: id,
      requestNumber: existing.requestNumber,
      title: existing.title,
      oldStatus: existing.status,
      newStatus: parsed.data.status,
      actorId: session.user.id,
      requestorId: existing.requestorId,
      assignedToId: existing.assignedToId,
    }).catch(() => {});
  }

  // Notify on assignment change
  if (parsed.data.assignedToId && parsed.data.assignedToId !== existing.assignedToId) {
    await notifyAssignment({
      requestId: id,
      requestNumber: existing.requestNumber,
      title: existing.title,
      assigneeId: parsed.data.assignedToId,
      actorId: session.user.id,
    }).catch(() => {});
  }

  return NextResponse.json(cr);
}

// DELETE /api/requests/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MDM_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.changeRequest.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      entityType: "ChangeRequest",
      entityId: id,
      action: "DELETE",
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
