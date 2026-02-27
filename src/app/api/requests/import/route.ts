import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateRequestNumber } from "@/lib/request-number";

// POST /api/requests/import — bulk import from CSV text
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (!["ADMIN", "MDM_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Admin or Manager required" }, { status: 403 });
  }

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  const VALID_CATEGORIES = ["ITEM_MASTER", "BOM", "ROUTING", "VENDOR", "CUSTOMER", "PRICE", "WAREHOUSE", "SYSTEM_CONFIG", "OTHER"];
  const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  let created = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.title) throw new Error("Title is required");

      const category = VALID_CATEGORIES.includes(row.category) ? row.category : "OTHER";
      const priority = VALID_PRIORITIES.includes(row.priority) ? row.priority : "MEDIUM";
      const requestNumber = await generateRequestNumber();

      await prisma.changeRequest.create({
        data: {
          requestNumber,
          title: row.title,
          description: row.description || null,
          category: category as any,
          priority: priority as any,
          status: "NEW",
          itemCode: row.itemCode || null,
          oldValue: row.oldValue || null,
          newValue: row.newValue || null,
          targetSystems: row.targetSystems ? row.targetSystems.split(";").map((s: string) => s.trim()) : [],
          source: "import",
          requestorId: session.user.id,
          requestorName: row.requestorName || null,
        },
      });
      created++;
    } catch (e: any) {
      errors.push({ row: i + 1, error: e.message?.slice(0, 100) || "Unknown error" });
    }
  }

  await prisma.auditLog.create({
    data: {
      entityType: "BulkImport",
      entityId: "batch",
      action: "IMPORT",
      changes: { totalRows: rows.length, created, errors: errors.length },
      userId: session.user.id,
    },
  });

  return NextResponse.json({ created, errors, total: rows.length });
}

// GET /api/requests/import — download CSV template
export async function GET() {
  const template = [
    "title,category,priority,itemCode,oldValue,newValue,targetSystems,requestorName,description",
    '"Update item status to DISC","ITEM_MASTER","HIGH","FG-10001","ACTIVE","DISC","PLM;EBS","John Doe","Discontinue product"',
  ].join("\n");

  return new NextResponse(template, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="import_template.csv"',
    },
  });
}
