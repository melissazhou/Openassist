import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/requests/[id]/submit — submit for approval
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cr = await prisma.changeRequest.findUnique({ where: { id } });
  if (!cr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["NEW", "IN_PROGRESS", "REJECTED"].includes(cr.status)) {
    return NextResponse.json({ error: `Cannot submit from status ${cr.status}` }, { status: 400 });
  }

  await prisma.changeRequest.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "ChangeRequest",
      entityId: id,
      action: "SUBMIT_FOR_APPROVAL",
      changes: { previousStatus: cr.status },
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true, status: "PENDING_APPROVAL" });
}
