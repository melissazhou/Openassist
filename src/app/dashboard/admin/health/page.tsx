"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, CheckCircle, XCircle, Database, Server, Cpu, HardDrive } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "healthy" ? "default" : "destructive"} className="gap-1">
      {status === "healthy" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {status}
    </Badge>
  );
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return [d > 0 && `${d}d`, h > 0 && `${h}h`, `${m}m`].filter(Boolean).join(" ");
}

export default function HealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-health"],
    queryFn: async () => {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error("Failed to load health");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Running health checks...</div>;

  const { checks } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Overall: <StatusBadge status={data?.status || "unknown"} />
            <span className="ml-4 text-xs">Checked in {data?.totalCheckMs}ms • Auto-refresh 30s</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Database */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Database (PostgreSQL)</CardTitle>
              <StatusBadge status={checks?.database?.status || "unknown"} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Latency</span><span>{checks?.database?.latencyMs}ms</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{checks?.databaseSize}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Users</span><span>{checks?.databaseStats?.users}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Change Requests</span><span>{checks?.databaseStats?.changeRequests}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Comments</span><span>{checks?.databaseStats?.comments}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Audit Logs</span><span>{checks?.databaseStats?.auditLogs}</span></div>
          </CardContent>
        </Card>

        {/* System */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <CardTitle>System</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Hostname</span><span>{checks?.system?.hostname}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span>{checks?.system?.platform} ({checks?.system?.arch})</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Node.js</span><span>{checks?.system?.nodeVersion}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span>{formatUptime(checks?.system?.uptime || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CPUs</span><span>{checks?.system?.cpus}</span></div>
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Memory</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">System Memory</span>
                <span>{checks?.system?.memoryUsagePercent}%</span>
              </div>
              <Progress value={checks?.system?.memoryUsagePercent || 0} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Used: {checks?.system?.totalMemoryMB - checks?.system?.freeMemoryMB} MB</span>
                <span>Total: {checks?.system?.totalMemoryMB} MB</span>
              </div>
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">Process Heap</span><span>{checks?.process?.heapUsedMB} / {checks?.process?.heapTotalMB} MB</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Process RSS</span><span>{checks?.process?.rssMB} MB</span></div>
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Environment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Node ENV</span><Badge variant="outline">{checks?.environment?.nodeEnv}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Next.js</span><span>{checks?.environment?.nextVersion}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Prisma</span><span>{checks?.environment?.prismaVersion}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Process PID</span><span>{checks?.process?.pid}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Process Uptime</span><span>{formatUptime(checks?.process?.uptimeSeconds || 0)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
