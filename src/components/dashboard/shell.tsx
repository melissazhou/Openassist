"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { PageBreadcrumb } from "@/components/dashboard/page-breadcrumb";
import { LoadingBar } from "@/components/dashboard/loading-bar";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Menu,
  ClipboardList,
  CheckSquare,
  Database,
  BookOpen,
  FileBarChart,
  Activity,
  Clock,
  Wrench,
  HelpCircle,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  collapsible?: boolean;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "MDM",
    collapsible: true,
    items: [
      { href: "/dashboard/requests", label: "Change Requests", icon: FileText },
      { href: "/dashboard/items", label: "Item Master", icon: Database },
      { href: "/dashboard/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/dashboard/dictionary", label: "Data Dictionary", icon: BookOpen },
    ],
  },
  {
    label: "Reports",
    collapsible: true,
    items: [
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/dashboard/reports", label: "Reports", icon: FileBarChart },
      { href: "/dashboard/audit", label: "Audit Log", icon: ClipboardList },
    ],
  },
  {
    label: "Admin",
    collapsible: true,
    items: [
      { href: "/dashboard/admin/health", label: "Health", icon: Activity, adminOnly: true },
      { href: "/dashboard/admin/jobs", label: "Jobs", icon: Clock, adminOnly: true },
      { href: "/dashboard/admin/config", label: "Configuration", icon: Wrench, adminOnly: true },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "",
    items: [
      { href: "/dashboard/help", label: "Help", icon: HelpCircle },
    ],
  },
];

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    role?: string;
  };
}

function SidebarNav({ pathname, userRole }: { pathname: string; userRole?: string }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <nav className="space-y-1 p-4">
      {navGroups.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || userRole === "ADMIN");
        if (items.length === 0) return null;
        const isCollapsed = group.collapsible && collapsed[group.label];
        const hasActiveItem = items.some(
          (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
        );

        return (
          <div key={group.label || "ungrouped"} className={group.label ? "mt-3" : ""}>
            {group.label && (
              <button
                onClick={() => group.collapsible && toggle(group.label)}
                className={cn(
                  "flex w-full items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  group.collapsible && "cursor-pointer hover:text-foreground"
                )}
              >
                {group.collapsible && (
                  <ChevronRight className={cn("h-3 w-3 transition-transform", !isCollapsed && "rotate-90")} />
                )}
                {group.label}
                {isCollapsed && hasActiveItem && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            )}
            {!isCollapsed && items.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <LoadingBar />
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-muted/30 lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold">OpenAssist</span>
          <Badge variant="secondary" className="ml-auto text-xs">MDM</Badge>
        </div>
        <SidebarNav pathname={pathname} userRole={user.role} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center gap-2 border-b px-6">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-bold">OpenAssist</span>
                </div>
                <SidebarNav pathname={pathname} userRole={user.role} />
              </SheetContent>
            </Sheet>
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold">OpenAssist</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border bg-muted px-2 text-xs text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.name}</span>
                  <Badge variant="outline" className="text-xs">{user.role}</Badge>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  Signed in as <strong className="ml-1">{user.name}</strong>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          <PageBreadcrumb />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Command Palette */}
        <CommandPalette />
      </div>
    </div>
  );
}
