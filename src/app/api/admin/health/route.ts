import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import os from "os";

// GET /api/admin/health — system health check
export async function GET() {
  const session = await auth();
  if (!session || !["ADMIN", "MDM_MANAGER"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // Database check
  try {
    const dbStart = Date.now();
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
    checks.database = {
      status: "healthy",
      latencyMs: Date.now() - dbStart,
      serverTime: result[0]?.now,
    };
  } catch (e: any) {
    checks.database = { status: "unhealthy", error: e.message };
  }

  // Database stats
  try {
    const [users, requests, comments, auditLogs] = await Promise.all([
      prisma.user.count(),
      prisma.changeRequest.count(),
      prisma.comment.count(),
      prisma.auditLog.count(),
    ]);
    checks.databaseStats = { users, changeRequests: requests, comments, auditLogs };
  } catch {
    checks.databaseStats = { status: "error" };
  }

  // Database size
  try {
    const size = await prisma.$queryRaw<{ size: string }[]>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    checks.databaseSize = size[0]?.size;
  } catch {
    checks.databaseSize = "unknown";
  }

  // System info
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  checks.system = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptime: Math.floor(os.uptime()),
    cpus: os.cpus().length,
    totalMemoryMB: Math.round(totalMem / 1024 / 1024),
    freeMemoryMB: Math.round(freeMem / 1024 / 1024),
    memoryUsagePercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
  };

  // Process info
  const mem = process.memoryUsage();
  checks.process = {
    pid: process.pid,
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
    uptimeSeconds: Math.floor(process.uptime()),
  };

  // Environment
  checks.environment = {
    nodeEnv: process.env.NODE_ENV || "development",
    nextVersion: "16.1.6",
    prismaVersion: "6.16.3",
  };

  const overallStatus = checks.database?.status === "healthy" ? "healthy" : "degraded";

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalCheckMs: Date.now() - startTime,
    checks,
  });
}
