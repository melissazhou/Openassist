import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports?type=summary|trend|sla|org|field
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["ADMIN", "MDM_MANAGER", "MDM_ANALYST"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") || "summary";

  switch (type) {
    case "summary":
      return getSummaryReport();
    case "trend":
      return getTrendReport();
    case "sla":
      return getSLAReport();
    case "org":
      return getOrgReport();
    case "field":
      return getFieldReport();
    default:
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
}

async function getSummaryReport() {
  const [total, byStatus, byCategory, byPriority, recentMonth] = await Promise.all([
    prisma.changeRequest.count(),
    prisma.changeRequest.groupBy({ by: ["status"], _count: true }),
    prisma.changeRequest.groupBy({ by: ["category"], _count: true }),
    prisma.changeRequest.groupBy({ by: ["priority"], _count: true }),
    prisma.changeRequest.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  const completed = byStatus.find((s) => s.status === "COMPLETED")?._count || 0;
  const avgCompletionDays = await getAvgCompletionDays();

  return NextResponse.json({
    total,
    recentMonth,
    completedTotal: completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgCompletionDays,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count])),
    byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
  });
}

async function getTrendReport() {
  // Monthly trend for last 12 months
  const results = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
    SELECT to_char(created_at, 'YYYY-MM') as month, count(*)::bigint as count
    FROM change_requests
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY to_char(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `;

  const completedTrend = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
    SELECT to_char(completed_at, 'YYYY-MM') as month, count(*)::bigint as count
    FROM change_requests
    WHERE completed_at IS NOT NULL AND completed_at >= NOW() - INTERVAL '12 months'
    GROUP BY to_char(completed_at, 'YYYY-MM')
    ORDER BY month ASC
  `;

  return NextResponse.json({
    created: results.map((r) => ({ month: r.month, count: Number(r.count) })),
    completed: completedTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
  });
}

async function getSLAReport() {
  // SLA based on priority
  const slaTargets: Record<string, number> = { LOW: 14, MEDIUM: 7, HIGH: 3, URGENT: 1 };

  const requests = await prisma.changeRequest.findMany({
    where: { status: { in: ["COMPLETED", "APPROVED"] }, completedAt: { not: null } },
    select: { priority: true, createdAt: true, completedAt: true },
  });

  const slaData: Record<string, { total: number; met: number; avgDays: number }> = {};

  for (const [priority, targetDays] of Object.entries(slaTargets)) {
    const priorityRequests = requests.filter((r) => r.priority === priority);
    const met = priorityRequests.filter((r) => {
      const days = (r.completedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return days <= targetDays;
    });
    const totalDays = priorityRequests.reduce((sum, r) => {
      return sum + (r.completedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);

    slaData[priority] = {
      total: priorityRequests.length,
      met: met.length,
      avgDays: priorityRequests.length > 0 ? Math.round((totalDays / priorityRequests.length) * 10) / 10 : 0,
    };
  }

  return NextResponse.json({ slaTargets, slaData });
}

async function getOrgReport() {
  // Unnest orgs array for counting
  const results = await prisma.$queryRaw<{ org: string; count: bigint }[]>`
    SELECT unnest(orgs) as org, count(*)::bigint as count
    FROM change_requests
    WHERE array_length(orgs, 1) > 0
    GROUP BY org
    ORDER BY count DESC
  `;

  // Org + status cross-tab
  const crossTab = await prisma.$queryRaw<{ org: string; status: string; count: bigint }[]>`
    SELECT unnest(orgs) as org, status, count(*)::bigint as count
    FROM change_requests
    WHERE array_length(orgs, 1) > 0
    GROUP BY org, status
    ORDER BY org, status
  `;

  return NextResponse.json({
    byOrg: results.map((r) => ({ org: r.org, count: Number(r.count) })),
    crossTab: crossTab.map((r) => ({ org: r.org, status: r.status, count: Number(r.count) })),
  });
}

async function getFieldReport() {
  const results = await prisma.changeRequest.groupBy({
    by: ["mdmField"],
    _count: true,
    orderBy: { _count: { mdmField: "desc" } },
    where: { mdmField: { not: null } },
  });

  // Field + status
  const fieldStatus = await prisma.$queryRaw<{ field: string; status: string; count: bigint }[]>`
    SELECT mdm_field as field, status, count(*)::bigint as count
    FROM change_requests
    WHERE mdm_field IS NOT NULL
    GROUP BY mdm_field, status
    ORDER BY mdm_field, status
  `;

  return NextResponse.json({
    byField: results.map((r) => ({ field: r.mdmField, count: r._count })),
    fieldStatus: fieldStatus.map((r) => ({ field: r.field, status: r.status, count: Number(r.count) })),
  });
}

async function getAvgCompletionDays() {
  const result = await prisma.$queryRaw<{ avg_days: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)::float as avg_days
    FROM change_requests
    WHERE completed_at IS NOT NULL
  `;
  return result[0]?.avg_days ? Math.round(result[0].avg_days * 10) / 10 : null;
}
