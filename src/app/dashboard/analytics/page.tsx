"use client";

import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  NEW: "#3b82f6", PENDING_REVIEW: "#eab308", IN_PROGRESS: "#a855f7",
  PENDING_APPROVAL: "#f97316", APPROVED: "#22c55e", REJECTED: "#ef4444",
  COMPLETED: "#10b981", CANCELLED: "#6b7280",
};

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#eab308", "#6366f1", "#14b8a6", "#64748b"];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#94a3b8", MEDIUM: "#3b82f6", HIGH: "#f97316", URGENT: "#ef4444",
};

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const axisColor = isDark ? "#a1a1aa" : "#71717a";
  const gridColor = isDark ? "#27272a" : "#e4e4e7";

  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      return res.json();
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading analytics...</div>;

  const statusData = Object.entries(data?.byStatus || {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "), value: value as number, fill: STATUS_COLORS[name] || "#6b7280",
  }));

  const categoryData = Object.entries(data?.byCategory || {}).map(([name, value], i) => ({
    name: name.replace(/_/g, " "), value: value as number, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const priorityData = Object.entries(data?.byPriority || {}).map(([name, value]) => ({
    name, value: value as number, fill: PRIORITY_COLORS[name] || "#6b7280",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          {data?.total || 0} total change requests
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: axisColor }}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: axisColor }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MDM Field Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>By MDM Field</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={Object.entries(data?.byField || {}).map(([name, value], i) => ({
                name: name?.replace(/_/g, " ") || "unknown", value: value as number, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              })).sort((a, b) => b.value - a.value)} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: axisColor }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: axisColor }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {Object.keys(data?.byField || {}).map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader><CardTitle>By Priority</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fill: axisColor }} />
                <YAxis tick={{ fill: axisColor }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
          <CardHeader><CardTitle>Latest 10 Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {data?.recentRequests?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div className="truncate max-w-[200px]">
                    <span className="font-mono text-primary">{r.requestNumber}</span>
                    <p className="truncate text-muted-foreground">{r.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

