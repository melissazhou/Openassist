import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const DEFAULT_CONFIGS = [
  // General
  { key: "app.name", value: "OpenAssist", type: "string", group: "general", label: "Application Name", description: "Display name of the application" },
  { key: "app.version", value: "1.0.0", type: "string", group: "general", label: "Version", description: "Current application version" },
  { key: "app.maintenance_mode", value: "false", type: "boolean", group: "general", label: "Maintenance Mode", description: "Enable maintenance mode (blocks non-admin access)" },

  // Workflow
  { key: "workflow.auto_assign", value: "false", type: "boolean", group: "workflow", label: "Auto Assign", description: "Automatically assign new requests to MDM team" },
  { key: "workflow.require_approval", value: "true", type: "boolean", group: "workflow", label: "Require Approval", description: "Require approval before completing change requests" },
  { key: "workflow.default_priority", value: "MEDIUM", type: "string", group: "workflow", label: "Default Priority", description: "Default priority for new change requests" },
  { key: "workflow.sla_days_low", value: "14", type: "number", group: "workflow", label: "SLA Days (Low)", description: "Target resolution days for Low priority" },
  { key: "workflow.sla_days_medium", value: "7", type: "number", group: "workflow", label: "SLA Days (Medium)", description: "Target resolution days for Medium priority" },
  { key: "workflow.sla_days_high", value: "3", type: "number", group: "workflow", label: "SLA Days (High)", description: "Target resolution days for High priority" },
  { key: "workflow.sla_days_urgent", value: "1", type: "number", group: "workflow", label: "SLA Days (Urgent)", description: "Target resolution days for Urgent priority" },

  // Notification
  { key: "notification.email_enabled", value: "false", type: "boolean", group: "notification", label: "Email Notifications", description: "Send email notifications for status changes" },
  { key: "notification.email_from", value: "openassist@ivcinc.com", type: "string", group: "notification", label: "From Email", description: "Sender email address" },

  // Integration
  { key: "integration.sharepoint_sync", value: "true", type: "boolean", group: "integration", label: "SharePoint Sync", description: "Enable SharePoint MDM list synchronization" },
  { key: "integration.sharepoint_interval_min", value: "10", type: "number", group: "integration", label: "SharePoint Sync Interval (min)", description: "Minutes between SharePoint sync runs" },
  { key: "integration.ingest_api_enabled", value: "true", type: "boolean", group: "integration", label: "Ingest API", description: "Enable external ingest API endpoint" },

  // Security
  { key: "security.max_login_attempts", value: "5", type: "number", group: "security", label: "Max Login Attempts", description: "Maximum failed login attempts before lockout" },
  { key: "security.session_timeout_hours", value: "24", type: "number", group: "security", label: "Session Timeout (hours)", description: "Session expiry time in hours" },
  { key: "security.password_min_length", value: "6", type: "number", group: "security", label: "Min Password Length", description: "Minimum password length for local accounts" },
];

// POST /api/admin/config/seed — seed default configs (idempotent)
export async function POST() {
  const session = await auth();
  if (!session || !["ADMIN"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let created = 0;
  for (const cfg of DEFAULT_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({ where: { key: cfg.key } });
    if (!existing) {
      await prisma.systemConfig.create({ data: cfg });
      created++;
    }
  }

  return NextResponse.json({ seeded: created, total: DEFAULT_CONFIGS.length });
}
