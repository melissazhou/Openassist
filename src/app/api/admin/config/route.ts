import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { configUpdateSchema } from "@/lib/validators";

// GET /api/admin/config — list all configs (grouped)
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const configs = await prisma.systemConfig.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    const grouped: Record<string, typeof configs> = {};
    for (const c of configs) {
      (grouped[c.group] ??= []).push(c);
    }

    return NextResponse.json({ configs, grouped });
  } catch (err: any) {
    console.error("[admin/config GET]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/config — bulk update configs
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = configUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const results = await Promise.all(
      parsed.data.updates.map(({ key, value }) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        entityType: "system_config",
        entityId: "bulk",
        action: "update",
        changes: parsed.data.updates as any,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ updated: results.length });
  } catch (err: any) {
    console.error("[admin/config PUT]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
