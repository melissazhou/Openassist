import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/requests/[id]/history — field-level change history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const logs = await prisma.auditLog.findMany({
    where: { entityId: id, entityType: "ChangeRequest" },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { displayName: true, username: true } } },
  });

  return NextResponse.json(logs);
}
