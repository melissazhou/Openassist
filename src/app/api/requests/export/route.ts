import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const status = params.get("status");
  const category = params.get("category");

  const where: any = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const items = await prisma.changeRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requestor: { select: { displayName: true } },
      assignedTo: { select: { displayName: true } },
    },
  });

  // Build CSV
  const headers = [
    "Request Number", "Title", "MDM Field", "Field Label", "Category", "Priority", "Status",
    "Item Code", "Item Codes", "Old Value", "New Value", "Target Systems", "Orgs",
    "Risk", "Source", "Source Status", "Requestor", "Assigned To",
    "Date Requested", "Created At", "Completed At",
  ];

  const rows = items.map((item) => [
    item.requestNumber,
    `"${(item.title || "").replace(/"/g, '""')}"`,
    item.mdmField || "",
    item.fieldLabel || "",
    item.category,
    item.priority,
    item.status,
    item.itemCode || "",
    (item.itemCodes || []).join(";"),
    `"${(item.oldValue || "").replace(/"/g, '""')}"`,
    `"${(item.newValue || "").replace(/"/g, '""')}"`,
    (item.targetSystems || []).join(";"),
    (item.orgs || []).join(";"),
    item.risk || "",
    item.source,
    item.sourceStatus || "",
    item.requestor?.displayName || item.requestorName || "",
    item.assignedTo?.displayName || item.assignedToName || "",
    item.dateRequested?.toISOString() || "",
    item.createdAt.toISOString(),
    item.completedAt?.toISOString() || "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="change_requests_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
