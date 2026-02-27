/**
 * MDM Request Parser — TypeScript port of flask-legacy/app/services/mdm_parser.py
 * Extracts structured fields from SharePoint title + instructions.
 */

interface ParseResult {
  field: string;
  system: string;
  items: string[];
  oldValue: string;
  newValue: string;
  orgs: string[];
  category: string;
}

// Category rules: [regex, fieldName, system]
const RULES: [RegExp, string, string][] = [
  [/\b(status|DISC|TRANSITION|APPROVED|SUSPEND|ACTIVE|INACTIVE)\b/i, "item_status", "PLM/EBS"],
  [/\b(buyer|planner)\b/i, "buyer_code", "EBS"],
  [/\b(pallet|config|layer|cases\/layer|shippers?\s*per\s*layer)\b/i, "pallet_config", "PLM"],
  [/\b(BOM|label|shipper\b(?!.*per))/i, "bom", "PLM/EBS"],
  [/\b(MOQ|minimum order|min\s*order)\b/i, "moq", "EBS"],
  [/\b(lead\s*time|LT\s+to\s+\d|process\s+lead)\b/i, "lead_time", "EBS"],
  [/\b(vendor|supplier)\b/i, "vendor", "EBS"],
  [/\b(sourcing\s*rule)\b/i, "sourcing_rule", "EBS"],
  [/\b(formula|MBR|MCR|recipe|bulk\s*formula)\b/i, "formula", "PLM/EBS"],
  [/\b(UPC|UCC|barcode)\b/i, "upc_code", "EBS"],
  [/\b(rounding\s*multiple)\b/i, "rounding_mult", "EBS"],
  [/\b(fixed\s*order|FOQ)\b/i, "foq", "EBS"],
];

const ITEM_PATTERNS: RegExp[] = [
  /\b([A-Z]{2,4}\d{5,7}[A-Z]?(?:-\d{1,2})?[NS]?)\b/g,
  /\b(RM\d{3,7})\b/g,
  /\b(LP\d{5,6})\b/g,
  /\b(PM\d{3,6}[A-Z]?)\b/g,
  /\b(LM\d{5,7}[A-Z]?)\b/g,
  /\b(PQ\d{5,7})\b/g,
  /\b(IN\d{5,7})\b/g,
  /\b(\d{5,7})\b/g,
];

const FROM_TO = /from\s+([A-Z0-9_-]+)\s+to\s+([A-Z0-9_-]+)/i;
const ORG_PATTERN = /\b(AND|DDR|WOD|PHL|IVCN?)\b/g;

const CATEGORY_LABELS: Record<string, string> = {
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
};

export function parseRequest(
  title: string,
  instructions: string,
  requestType: string = ""
): ParseResult {
  const combined = `${title} ${instructions}`.trim();
  if (!combined) return emptyResult();

  const [field, system, category] = detectField(combined, requestType);
  const items = extractItems(combined);
  const [oldValue, newValue] = extractValues(combined, field);
  const orgs = [...new Set(combined.match(ORG_PATTERN) || [])].sort();

  return { field, system, items, oldValue, newValue, orgs, category };
}

function detectField(text: string, requestType: string): [string, string, string] {
  const typeLower = requestType.toLowerCase();
  if (typeLower.includes("bulk formula")) return ["formula", "PLM/EBS", "Formula/MBR Upload"];
  if (typeLower.includes("sourcing")) return ["sourcing_rule", "EBS", "Sourcing Rule"];
  if (typeLower.includes("safety stock") || typeLower.replace(/\s/g, "").includes("moq"))
    return ["moq", "EBS", "MOQ Update"];

  for (const [pattern, field, system] of RULES) {
    if (pattern.test(text)) return [field, system, CATEGORY_LABELS[field] || field];
  }

  const typeMap: Record<string, [string, string, string]> = {
    "bom updates": ["bom", "PLM/EBS", "BOM Update"],
    "status change": ["item_status", "PLM/EBS", "Status Change"],
    "special requests": ["misc", "EBS", "Special Request"],
    miscellaneous: ["misc", "EBS", "Miscellaneous"],
    "vendor moq": ["moq", "EBS", "MOQ Update"],
  };
  for (const [key, val] of Object.entries(typeMap)) {
    if (typeLower.includes(key)) return val;
  }

  return ["other", "EBS", "Other"];
}

function extractItems(text: string): string[] {
  const items: string[] = [];
  const seen = new Set<string>();
  for (const pattern of ITEM_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const item = m[1];
      if (/^\d+$/.test(item) && (item.length < 5 || parseInt(item) < 10000)) continue;
      if (!seen.has(item)) {
        items.push(item);
        seen.add(item);
      }
    }
    if (items.length >= 20) break;
  }
  return items.slice(0, 20);
}

function extractValues(text: string, field: string): [string, string] {
  const ft = FROM_TO.exec(text);
  if (ft) return [ft[1], ft[2]];

  const toMatch = /\bto\s+(\d+\.?\d*\s*(?:kg|days|kgs)?)\b/i.exec(text);
  if (toMatch) return ["", toMatch[1]];

  const moqMatch = /MOQ\s+(?:to\s+)?([0-9,]+(?:\s*(?:kg|kgs))?)/i.exec(text);
  if (moqMatch && (field === "moq" || field === "rounding_mult")) return ["", moqMatch[1]];

  if (field === "pallet_config") {
    const pc = /(\d+)[/x×](\d+)/.exec(text);
    if (pc) return ["", `${pc[1]}/${pc[2]}`];
    const layer = /layers?\s*(?:per\s*pallet)?\s*(?:to)?\s*(\d+)/i.exec(text);
    if (layer) return ["", `layers=${layer[1]}`];
    const cases = /cases\/layer\s+(?:to\s+)?(\d+)/i.exec(text);
    if (cases) return ["", `cases/layer=${cases[1]}`];
  }

  if (field === "lead_time") {
    const lt = /(\d+)\s*days/i.exec(text);
    if (lt) return ["", `${lt[1]} days`];
  }

  return ["", ""];
}

function emptyResult(): ParseResult {
  return { field: "other", system: "EBS", items: [], oldValue: "", newValue: "", orgs: [], category: "Other" };
}

// Map parser category string to Prisma ChangeCategory enum
const CATEGORY_TO_ENUM: Record<string, string> = {
  "Status Change": "ITEM_MASTER",
  "Buyer/Planner Update": "ITEM_MASTER",
  "Pallet Config Update": "ITEM_MASTER",
  "BOM Update": "BOM",
  "MOQ Update": "ITEM_MASTER",
  "Lead Time Update": "ITEM_MASTER",
  "Vendor Update": "VENDOR",
  "Sourcing Rule": "ITEM_MASTER",
  "Formula/MBR Upload": "BOM",
  "UPC Update": "ITEM_MASTER",
  "Rounding Multiple Update": "ITEM_MASTER",
  "FOQ Update": "ITEM_MASTER",
  "Special Request": "OTHER",
  "Miscellaneous": "OTHER",
  "Other": "OTHER",
};

export function categoryToEnum(parserCategory: string): string {
  return CATEGORY_TO_ENUM[parserCategory] || "OTHER";
}
