import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getStats() {
  const [total, newCount, inProgress, completed, recent] = await Promise.all([
    prisma.changeRequest.count(),
    prisma.changeRequest.count({ where: { status: "NEW" } }),
    prisma.changeRequest.count({ where: { status: { in: ["IN_PROGRESS", "PENDING_REVIEW", "PENDING_APPROVAL"] } } }),
    prisma.changeRequest.count({ where: { status: { in: ["COMPLETED", "APPROVED"] } } }),
    prisma.changeRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, requestNumber: true, title: true, status: true, priority: true, createdAt: true },
    }),
  ]);
  return { total, new: newCount, inProgress, completed, recent };
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export default async function DashboardPage() {
  const stats = await getStats();

  const cards = [
    { title: "Total Requests", value: stats.total, icon: FileText, color: "text-blue-600" },
    { title: "New", value: stats.new, icon: AlertTriangle, color: "text-orange-600" },
    { title: "In Progress", value: stats.inProgress, icon: Clock, color: "text-yellow-600" },
    { title: "Completed", value: stats.completed, icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Master Data Management Overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Link href="/dashboard/requests">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">View All</Badge>
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No change requests yet. <Link href="/dashboard/requests" className="text-primary hover:underline">Create your first request</Link>.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recent.map((item) => (
                <Link key={item.id} href={`/dashboard/requests/${item.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <span className="font-mono text-sm text-primary">{item.requestNumber}</span>
                    <p className="text-sm mt-0.5 truncate max-w-[400px]">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status] || "bg-gray-100"}`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
