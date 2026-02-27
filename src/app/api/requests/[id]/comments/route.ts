import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notifyComment } from "@/lib/notifications";
import { createCommentSchema } from "@/lib/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
  const { content } = parsed.data;

  const comment = await prisma.comment.create({
    data: {
      changeRequestId: id,
      authorId: session.user.id,
      content: content.trim(),
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  // Notify requestor and assignee about new comment
  const cr = await prisma.changeRequest.findUnique({
    where: { id },
    select: { requestNumber: true, title: true, requestorId: true, assignedToId: true },
  });
  if (cr) {
    const recipientIds = [cr.requestorId, cr.assignedToId].filter(Boolean) as string[];
    await notifyComment({
      requestId: id,
      requestNumber: cr.requestNumber,
      title: cr.title,
      commentAuthorId: session.user.id,
      commentAuthorName: session.user.name || "Unknown",
      recipientIds,
    }).catch(() => {});
  }

  return NextResponse.json(comment, { status: 201 });
}
