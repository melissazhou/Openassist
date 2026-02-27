import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createChangeRequestSchema } from "@/lib/validators";
import { generateRequestNumber } from "@/lib/request-number";

// GET /api/requests — list with filters & pagination
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(params.get("pageSize") || "20")));
  const status = params.get("status");
  const category = params.get("category");
  const mdmField = params.get("mdmField");
  const org = params.get("org");
  const search = params.get("search");
  const sortBy = params.get("sortBy") || "createdAt";
  const sortOrder = params.get("sortOrder") === "asc" ? "asc" : "desc";

  const where: any = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (mdmField) where.mdmField = mdmField;
  if (org) where.orgs = { has: org };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { requestNumber: { contains: search, mode: "insensitive" } },
      { itemCode: { contains: search, mode: "insensitive" } },
      { requestorName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.changeRequest.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        requestor: { select: { id: true, displayName: true, username: true } },
        assignedTo: { select: { id: true, displayName: true, username: true } },
      },
    }),
    prisma.changeRequest.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST /api/requests — create new
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const requestNumber = await generateRequestNumber();

  const cr = await prisma.changeRequest.create({
    data: {
      requestNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      itemCode: data.itemCode,
      oldValue: data.oldValue,
      newValue: data.newValue,
      targetSystems: data.targetSystems,
      requestorName: data.requestorName,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      requestorId: session.user.id,
      source: "manual",
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      entityType: "ChangeRequest",
      entityId: cr.id,
      action: "CREATE",
      changes: body,
      userId: session.user.id,
    },
  });

  return NextResponse.json(cr, { status: 201 });
}
