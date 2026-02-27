/**
 * Migrate Flask JSON data → PostgreSQL (full fidelity)
 * Preserves ALL fields: mdmField, fieldLabel, changeType, orgs, risk, sourceStatus, assignedTo, dateRequested, itemCodes
 * Usage: npx tsx scripts/migrate-json.ts
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface LegacyRecord {
  request_id: string;
  source_title: string;
  items: string[];
  item: string;
  orgs: string[];
  org: string;
  change_type: string;
  category: string;
  field: string;
  old_value: string;
  new_value: string;
  system: string;
  priority: string;
  risk: string;
  status: string;
  source_status: string;
  requestor: string;
  date_requested: string;
  requested_completion: string;
  instructions: string;
  assigned_to: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

function mapStatus(status: string, sourceStatus: string): string {
  const s = (status || "").toLowerCase();
  const ss = (sourceStatus || "").toLowerCase();
  if (s === "completed" || ss === "completed") return "COMPLETED";
  if (s === "approved" || ss === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  if (ss === "cancelled") return "CANCELLED";
  if (s === "in progress" || ss === "in progress") return "IN_PROGRESS";
  if (ss === "not started") return "NEW";
  if (ss.includes("hold")) return "PENDING_REVIEW";
  if (s === "pending") return "NEW";
  return "NEW";
}

function mapPriority(p: string): string {
  const pl = (p || "").toLowerCase();
  if (pl === "urgent" || pl === "critical") return "URGENT";
  if (pl === "high") return "HIGH";
  if (pl === "low") return "LOW";
  return "MEDIUM";
}

// Map the parser field to ChangeCategory enum
function fieldToCategory(field: string): string {
  const map: Record<string, string> = {
    item_status: "ITEM_MASTER",
    buyer_code: "ITEM_MASTER",
    pallet_config: "ITEM_MASTER",
    moq: "ITEM_MASTER",
    lead_time: "ITEM_MASTER",
    upc_code: "ITEM_MASTER",
    rounding_mult: "ITEM_MASTER",
    foq: "ITEM_MASTER",
    sourcing_rule: "ITEM_MASTER",
    bom: "BOM",
    formula: "BOM",
    vendor: "VENDOR",
    misc: "OTHER",
    other: "OTHER",
  };
  return map[field] || "OTHER";
}

// Human-readable label for the MDM field
const FIELD_LABELS: Record<string, string> = {
  item_status: "Status Change",
  buyer_code: "Buyer/Planner Update",
  pallet_config: "Pallet Config Update",
  bom: "BOM Update",
  moq: "MOQ Update",
  lead_time: "Lead Time Update",
  vendor: "Vendor Update",
  sourcing_rule: "Sourcing Rule",
  formula: "Formula/MBR Upload",
  upc_code: "UPC Update",
  rounding_mult: "Rounding Multiple Update",
  foq: "FOQ Update",
  misc: "Miscellaneous",
  other: "Other",
};

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) return new Date(parseInt(parts[3]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const jsonPath = path.resolve(__dirname, "../flask-legacy/app/data/change_requests.json");
  console.log(`Reading ${jsonPath}...`);
  const raw: LegacyRecord[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Found ${raw.length} records`);

  const idCount = new Map<string, number>();
  let created = 0;
  let errors = 0;

  for (let i = 0; i < raw.length; i += 50) {
    const batch = raw.slice(i, i + 50);
    const ops = [];

    for (const r of batch) {
      const origId = r.request_id;
      const count = idCount.get(origId) || 0;
      idCount.set(origId, count + 1);
      const requestNumber = count === 0 ? origId : `${origId}-${count}`;

      const status = mapStatus(r.status, r.source_status);
      const createdAt = parseDate(r.created_at) || new Date();
      const completedAt = status === "COMPLETED" ? (parseDate(r.approved_at) || createdAt) : null;
      const field = r.field || "other";

      ops.push(
        prisma.changeRequest.create({
          data: {
            requestNumber,
            title: r.source_title || "Untitled",
            description: r.instructions || null,

            // ── MDM Classification (full fidelity) ──
            category: fieldToCategory(field) as any,
            changeType: r.change_type || null,
            mdmField: field,
            fieldLabel: FIELD_LABELS[field] || r.category || null,

            priority: mapPriority(r.priority) as any,
            status: status as any,
            risk: r.risk || null,

            // ── Item & Change Details ──
            itemCode: r.item || (r.items?.[0]) || null,
            itemCodes: r.items || [],
            oldValue: r.old_value || null,
            newValue: r.new_value || null,

            // ── Target Systems & Orgs ──
            targetSystems: r.system ? r.system.split("/").map(s => s.trim()) : [],
            orgs: r.orgs || [],

            // ── Source ──
            source: "sharepoint",
            sourceRef: origId,
            sourceStatus: r.source_status || null,
            rawContent: r.source_title,
            parsedData: {
              changeType: r.change_type,
              risk: r.risk,
              approvedBy: r.approved_by,
              approvedAt: r.approved_at,
              createdBy: r.created_by,
              updatedAt: r.updated_at,
            },

            // ── People ──
            requestorName: r.requestor || null,
            assignedToName: r.assigned_to || null,

            // ── Dates ──
            dateRequested: parseDate(r.date_requested),
            dueDate: parseDate(r.requested_completion),
            completedAt,
            createdAt,
          },
        })
      );
    }

    try {
      await prisma.$transaction(ops);
      created += ops.length;
    } catch {
      for (const op of ops) {
        try { await op; created++; }
        catch (err: any) {
          errors++;
          if (errors <= 5) console.error(`  Error: ${err.message?.slice(0, 120)}`);
        }
      }
    }

    if ((i + 50) % 500 < 50 || i + 50 >= raw.length) {
      console.log(`  Progress: ${Math.min(i + 50, raw.length)}/${raw.length} (created: ${created})`);
    }
  }

  const total = await prisma.changeRequest.count();
  console.log(`\n✅ Migration complete: ${created} created, ${errors} errors, ${total} total in DB`);

  // Print distribution
  const byField = await prisma.changeRequest.groupBy({ by: ["mdmField"], _count: true, orderBy: { _count: { mdmField: "desc" } } });
  console.log("\nBy MDM Field:");
  for (const f of byField) console.log(`  ${f.mdmField}: ${f._count}`);

  const byOrg = await prisma.$queryRaw`SELECT unnest(orgs) as org, COUNT(*) as cnt FROM change_requests GROUP BY org ORDER BY cnt DESC`;
  console.log("\nBy Org:");
  for (const o of byOrg as any[]) console.log(`  ${o.org}: ${o.cnt}`);
}

main()
  .catch((e) => { console.error("❌ Failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
