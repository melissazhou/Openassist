"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Workflow, Shield, Database, FileText, HelpCircle, Keyboard } from "lucide-react";

const sections = [
  {
    id: "overview",
    icon: BookOpen,
    title: "Overview",
    content: `
**OpenAssist** is an enterprise Master Data Management (MDM) platform for tracking and managing change requests across PLM, EBS, and WMS systems.

### Key Capabilities
- **Change Request Management** — Full lifecycle from creation to completion
- **Multi-system Tracking** — PLM, EBS, and WMS change coordination
- **Approval Workflow** — Submit → Review → Approve/Reject → Complete
- **Data Quality** — 14 MDM field types, risk assessment, SLA tracking
- **Analytics & Reports** — Multi-dimensional analysis, CSV export
- **Audit Trail** — Complete operation history

### Organizations Supported
AND (Anderson), DDR, WOD, PHL, IVC, IVCN
    `,
  },
  {
    id: "workflow",
    icon: Workflow,
    title: "Workflow",
    content: `
### Change Request Lifecycle

\`\`\`
NEW → PENDING_REVIEW → IN_PROGRESS → PENDING_APPROVAL → APPROVED → COMPLETED
                                    ↘ REJECTED
Any state → CANCELLED
\`\`\`

### Status Descriptions
| Status | Description |
|--------|-------------|
| **NEW** | Just created, not yet reviewed |
| **PENDING_REVIEW** | Awaiting MDM team review |
| **IN_PROGRESS** | Being worked on |
| **PENDING_APPROVAL** | Submitted for approval |
| **APPROVED** | Approved, ready for execution |
| **REJECTED** | Rejected (reason required) |
| **COMPLETED** | Change executed in target systems |
| **CANCELLED** | Cancelled at any stage |

### Approval Process
1. Requestor or MDM Analyst clicks **Submit for Approval**
2. Request moves to PENDING_APPROVAL
3. Admin or Manager reviews in **Approval Center**
4. **Approve** → moves to APPROVED
5. **Reject** → moves to REJECTED (reason required)
    `,
  },
  {
    id: "roles",
    icon: Shield,
    title: "Roles & Permissions",
    content: `
### User Roles

| Role | Capabilities |
|------|-------------|
| **ADMIN** | Full system access, user management, config, jobs |
| **MDM_MANAGER** | Approve/reject, all CRs, analytics, reports |
| **MDM_ANALYST** | Create/edit CRs, submit for approval |
| **REQUESTOR** | Create CRs, view own requests |
| **VIEWER** | Read-only access |

### Admin-Only Features
- System Configuration
- Scheduled Jobs Management
- User Management (create/edit/disable)
- Health Monitoring
    `,
  },
  {
    id: "fields",
    icon: Database,
    title: "MDM Fields",
    content: `
### MDM Field Types (14)

| Field | Description | Example |
|-------|-------------|---------|
| **item_status** | Item status changes | Active → Inactive |
| **buyer_code** | Buyer/planner code | Reassign buyer |
| **pallet_config** | Pallet configuration | Ti/Hi changes |
| **bom** | Bill of Materials | Component add/remove |
| **moq** | Minimum Order Quantity | MOQ update |
| **lead_time** | Lead time updates | Processing/transit time |
| **vendor** | Vendor/supplier info | New vendor setup |
| **sourcing_rule** | Sourcing rules | Rule assignment |
| **formula** | Formula/recipe | Formula changes |
| **upc_code** | UPC/barcode | Code assignment |
| **rounding_mult** | Rounding multiplier | Order rounding |
| **foq** | Fixed Order Quantity | FOQ update |
| **misc** | Miscellaneous | Other field changes |
| **other** | Unclassified | Auto-categorized |

### Categories
ITEM_MASTER, BOM, ROUTING, VENDOR, CUSTOMER, PRICE, WAREHOUSE, SYSTEM_CONFIG, OTHER

### Target Systems
- **PLM** — Product Lifecycle Management
- **EBS** — Oracle E-Business Suite
- **PLM+EBS** — Both systems
    `,
  },
  {
    id: "import",
    icon: FileText,
    title: "Data Import/Export",
    content: `
### CSV Export
1. Go to **Change Requests** list
2. Click **Export** button (top right)
3. Current filters are applied to export
4. Downloads as \`change_requests_YYYYMMDD.csv\`

### Bulk Import (CSV Paste)
1. Go to **Change Requests** → **Import**
2. Paste CSV data (comma or tab separated)
3. Required columns: **title**
4. Optional: category, priority, description, itemCode, oldValue, newValue
5. System validates and creates records

### Ingest API
\`\`\`
POST /api/mdm/ingest
Header: x-api-key: <INGEST_API_KEY>
Body: { "title": "...", "description": "..." }
  or: { "records": [...] }
\`\`\`
Smart Parser auto-categorizes based on title/description content.
    `,
  },
  {
    id: "shortcuts",
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    content: `
### Global
| Shortcut | Action |
|----------|--------|
| **⌘K** / **Ctrl+K** | Open command palette |
| **Esc** | Close dialogs/palette |

### Command Palette
- Type to search pages and change requests
- Use ↑↓ to navigate, Enter to select
- Searches by request number, title, and description
    `,
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "FAQ",
    content: `
### How are request numbers generated?
Format: \`CR-YYYYMM-NNNN\` (e.g., CR-202602-0001). Auto-incremented per month.

### What does the Smart Parser do?
Analyzes title and description text to:
- Auto-assign category (12 regex rules)
- Extract item numbers (8 patterns)
- Identify from/to values
- Classify MDM field type

### Can I edit a completed request?
No. Completed and Cancelled requests are locked. Create a new request instead.

### How does SharePoint sync work?
An external cron job scrapes the SharePoint MDM list and pushes records via the Ingest API. New records are created; existing ones are updated if status changed.

### What happens when I delete a request?
The request and all related comments, approvals, and attachments are permanently deleted. Only Admin and MDM_MANAGER roles can delete. This action is logged in audit.
    `,
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help & Documentation</h1>
        <p className="text-muted-foreground">OpenAssist MDM Platform — User Guide</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <TabsTrigger key={s.id} value={s.id}>
                <Icon className="mr-1 h-4 w-4" />{s.title}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {sections.map((s) => (
          <TabsContent key={s.id} value={s.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <s.icon className="h-5 w-5" />{s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: markdownToHtml(s.content) }} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Minimal markdown → HTML (no external dep)
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded text-sm overflow-x-auto"><code>$1</code></pre>')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return "";
      const tag = "td";
      return `<tr>${cells.map((c) => `<${tag} class="border px-3 py-1">${c}</${tag}>`).join("")}</tr>`;
    })
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table class="w-full border-collapse border text-sm mb-4">$1</table>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/((?:<li.*<\/li>\n?)+)/g, '<ul class="list-disc mb-3">$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n{2,}/g, "<br/><br/>")
    .replace(/\n/g, "\n");
}
