import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/admin/jobs/[id]/run — manually trigger a job
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const job = await prisma.scheduledJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Create a run record
  const run = await prisma.jobRun.create({
    data: { jobId: id, status: "running" },
  });

  // Update job status
  await prisma.scheduledJob.update({
    where: { id },
    data: { lastRunAt: new Date(), lastStatus: "running" },
  });

  // Simulate execution (in real implementation, this would dispatch to a job runner)
  const startTime = Date.now();
  try {
    // For now, just mark as success — real handlers would be plugged in here
    const duration = Date.now() - startTime;
    await prisma.jobRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        duration,
        output: `Job "${job.name}" (handler: ${job.handler}) executed manually by ${session.user.name}`,
      },
    });
    await prisma.scheduledJob.update({
      where: { id },
      data: { lastStatus: "success", lastError: null },
    });

    return NextResponse.json({ run: { ...run, status: "success", duration } });
  } catch (e: any) {
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), duration: Date.now() - startTime, error: e.message },
    });
    await prisma.scheduledJob.update({
      where: { id },
      data: { lastStatus: "failed", lastError: e.message },
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
