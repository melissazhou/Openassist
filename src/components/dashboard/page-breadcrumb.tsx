"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  requests: "Change Requests",
  items: "Item Master",
  analytics: "Analytics",
  reports: "Reports",
  approvals: "Approvals",
  dictionary: "Data Dictionary",
  audit: "Audit Log",
  admin: "Admin",
  health: "Health",
  jobs: "Jobs",
  config: "Configuration",
  settings: "Settings",
  help: "Help",
  kanban: "Kanban",
};

export function PageBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = labelMap[seg] || decodeURIComponent(seg);
    const isLast = i === segments.length - 1;
    // Skip dynamic segments like [id] — show as "Detail"
    const isId = /^[a-z0-9]{20,}$/i.test(seg) || /^\d+$/.test(seg);
    const displayLabel = isId ? "Detail" : label;
    return { href, label: displayLabel, isLast };
  });

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.href}>
            {i > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
