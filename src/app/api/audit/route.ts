import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "MDM_MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(params.get("pageSize") || "50"));
    const entityType = params.get("entityType");
    const action = params.get("action");

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, displayName: true, username: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (err: any) {
    console.error("[audit GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
