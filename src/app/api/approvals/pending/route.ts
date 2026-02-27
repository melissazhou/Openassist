import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (!["ADMIN", "MDM_MANAGER", "MDM_ANALYST"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = await prisma.changeRequest.findMany({
      where: { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
      include: {
        requestor: { select: { displayName: true, username: true } },
        approvals: {
          include: { approver: { select: { displayName: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[approvals/pending GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
