import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/admin/jobs/[id] — update job
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, description, cronExpr, handler, config, enabled } = body;

  const job = await prisma.scheduledJob.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(cronExpr !== undefined && { cronExpr }),
      ...(handler !== undefined && { handler }),
      ...(config !== undefined && { config }),
      ...(enabled !== undefined && { enabled }),
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "scheduled_job",
      entityId: id,
      action: "update",
      changes: body,
      userId: session.user.id,
    },
  });

  return NextResponse.json(job);
}

// DELETE /api/admin/jobs/[id] — delete job
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.scheduledJob.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      entityType: "scheduled_job",
      entityId: id,
      action: "delete",
      userId: session.user.id,
    },
  });

  return NextResponse.json({ deleted: true });
}
