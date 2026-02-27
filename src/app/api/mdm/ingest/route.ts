import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseRequest, categoryToEnum } from "@/lib/mdm-parser";

const INGEST_KEY = process.env.INGEST_API_KEY || "openassist-ingest-2026";

export async function POST(req: NextRequest) {
  // API key auth
  const authHeader = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (authHeader !== INGEST_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const items = Array.isArray(body) ? body : [body];

  const results: { requestNumber: string; action: string; id: string }[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const requestId = item.request_id || item.requestId;
    const title = item.source_title || item.title || "";
    const instructions = item.instructions || item.description || "";

    if (!requestId) {
      skipped++;
      continue;
    }

    // Check for existing
    const existing = await prisma.changeRequest.findUnique({
      where: { requestNumber: requestId },
    });

    // Parse with smart parser
    const parsed = parseRequest(title, instructions, item.change_type || "");

    // Map status
    const status = mapIngestStatus(item.status, item.source_status);
    const priority = mapIngestPriority(item.priority);
    const category = categoryToEnum(parsed.category) as any;

    const data = {
      title: title || "Untitled",
      description: instructions || null,
      category,
      priority,
      status,
      itemCode: parsed.items[0] || item.item || null,
      oldValue: parsed.oldValue || item.old_value || null,
      newValue: parsed.newValue || item.new_value || null,
      targetSystems: item.system ? item.system.split("/").map((s: string) => s.trim()) : [],
      source: "sharepoint",
      sourceRef: requestId,
      rawContent: title,
      parsedData: {
        field: parsed.field,
        category: parsed.category,
        changeType: item.change_type,
        orgs: parsed.orgs,
        risk: item.risk,
        sourceStatus: item.source_status,
        assignedTo: item.assigned_to,
      },
      requestorName: item.requestor || null,
      dueDate: item.requested_completion ? tryParseDate(item.requested_completion) : null,
    };

    if (existing) {
      // Update only if source_status changed
      if (item.source_status && item.source_status !== (existing.parsedData as any)?.sourceStatus) {
        await prisma.changeRequest.update({
          where: { id: existing.id },
          data: {
            status,
            parsedData: data.parsedData,
            requestorName: data.requestorName || existing.requestorName,
          },
        });
        results.push({ requestNumber: requestId, action: "updated", id: existing.id });
        updated++;
      } else {
        results.push({ requestNumber: requestId, action: "skipped", id: existing.id });
        skipped++;
      }
    } else {
      const cr = await prisma.changeRequest.create({
        data: {
          requestNumber: requestId,
          ...data,
          createdAt: item.created_at ? tryParseDate(item.created_at) || new Date() : new Date(),
        },
      });
      results.push({ requestNumber: requestId, action: "created", id: cr.id });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    summary: { created, updated, skipped, total: items.length },
    results,
  });
}

function mapIngestStatus(status: string, sourceStatus: string): any {
  const s = (status || "").toLowerCase();
  const ss = (sourceStatus || "").toLowerCase();
  if (s === "completed" || ss === "completed") return "COMPLETED";
  if (s === "approved" || ss === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  if (s === "cancelled") return "CANCELLED";
  if (s === "in progress" || ss === "in progress") return "IN_PROGRESS";
  if (s === "pending review") return "PENDING_REVIEW";
  if (s === "pending approval") return "PENDING_APPROVAL";
  return "NEW";
}

function mapIngestPriority(p: string): any {
  const pl = (p || "").toLowerCase();
  if (pl === "urgent" || pl === "critical") return "URGENT";
  if (pl === "high") return "HIGH";
  if (pl === "low") return "LOW";
  return "MEDIUM";
}

function tryParseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) return new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
