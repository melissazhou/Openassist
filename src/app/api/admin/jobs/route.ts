import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/jobs
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobs = await prisma.scheduledJob.findMany({
      orderBy: { createdAt: "desc" },
      include: { runs: { orderBy: { startedAt: "desc" }, take: 5 } },
    });

    return NextResponse.json({ jobs });
  } catch (err: any) {
    console.error("[admin/jobs GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/jobs
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, cronExpr, handler, config, enabled } = body;

    if (!name || !cronExpr || !handler) {
      return NextResponse.json({ error: "name, cronExpr, handler required" }, { status: 400 });
    }

    const job = await prisma.scheduledJob.create({
      data: { name, description, cronExpr, handler, config, enabled: enabled ?? true },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "scheduled_job",
        entityId: job.id,
        action: "create",
        changes: { name, cronExpr, handler },
        userId: session.user.id,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (err: any) {
    console.error("[admin/jobs POST]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
