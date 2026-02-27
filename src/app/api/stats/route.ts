import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [total, byStatus, byCategory, byPriority, byField, recentRequests] = await Promise.all([
      prisma.changeRequest.count(),
      prisma.changeRequest.groupBy({ by: ["status"], _count: true }),
      prisma.changeRequest.groupBy({ by: ["category"], _count: true }),
      prisma.changeRequest.groupBy({ by: ["priority"], _count: true }),
      prisma.changeRequest.groupBy({ by: ["mdmField"], _count: true, orderBy: { _count: { mdmField: "desc" } } }),
      prisma.changeRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, requestNumber: true, title: true, status: true,
          category: true, priority: true, createdAt: true, requestorName: true,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count])),
      byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
      byField: Object.fromEntries(byField.map((f) => [f.mdmField || "unknown", f._count])),
      recentRequests,
    });
  } catch (err: any) {
    console.error("[stats GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
