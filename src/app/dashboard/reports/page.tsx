"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Download, TrendingUp, Target, Building2, Layers } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  NEW: "#3b82f6", PENDING_REVIEW: "#eab308", IN_PROGRESS: "#a855f7",
  PENDING_APPROVAL: "#f97316", APPROVED: "#22c55e", REJECTED: "#ef4444",
  COMPLETED: "#10b981", CANCELLED: "#6b7280",
};
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#eab308", "#6366f1", "#14b8a6"];

export default function ReportsPage() {
  const [tab, setTab] = useState("summary");

  const { data: summary } = useQuery({
    queryKey: ["report", "summary"],
    queryFn: () => fetch("/api/reports?type=summary").then((r) => r.json()),
  });
  const { data: trend } = useQuery({
    queryKey: ["report", "trend"],
    queryFn: () => fetch("/api/reports?type=trend").then((r) => r.json()),
    enabled: tab === "trend",
  });
  const { data: sla } = useQuery({
    queryKey: ["report", "sla"],
    queryFn: () => fetch("/api/reports?type=sla").then((r) => r.json()),
    enabled: tab === "sla",
  });
  const { data: org } = useQuery({
    queryKey: ["report", "org"],
    queryFn: () => fetch("/api/reports?type=org").then((r) => r.json()),
    enabled: tab === "org",
  });
  const { data: field } = useQuery({
    queryKey: ["report", "field"],
    queryFn: () => fetch("/api/reports?type=field").then((r) => r.json()),
    enabled: tab === "field",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Multi-dimensional analytics and export</p>
        </div>
        <Button variant="outline" onClick={() => window.open("/api/requests/export", "_blank")}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{summary.total}</div><p className="text-sm text-muted-foreground">Total Requests</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{summary.recentMonth}</div><p className="text-sm text-muted-foreground">Last 30 Days</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{summary.completedTotal}</div><p className="text-sm text-muted-foreground">Completed</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{summary.completionRate}%</div><p className="text-sm text-muted-foreground">Completion Rate</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{summary.avgCompletionDays ?? "—"}</div><p className="text-sm text-muted-foreground">Avg Days to Complete</p></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary"><Layers className="mr-1 h-4 w-4" />Summary</TabsTrigger>
          <TabsTrigger value="trend"><TrendingUp className="mr-1 h-4 w-4" />Trend</TabsTrigger>
          <TabsTrigger value="sla"><Target className="mr-1 h-4 w-4" />SLA</TabsTrigger>
          <TabsTrigger value="org"><Building2 className="mr-1 h-4 w-4" />By Org</TabsTrigger>
          <TabsTrigger value="field"><Layers className="mr-1 h-4 w-4" />By Field</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {summary && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={Object.entries(summary.byStatus).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: v as number, fill: STATUS_COLORS[k] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                        {Object.entries(summary.byStatus).map(([k], i) => <Cell key={i} fill={STATUS_COLORS[k]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>By Priority</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(summary.byPriority).map(([k, v]) => ({ name: k, value: v as number }))}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trend">
          {trend && (
            <Card>
              <CardHeader><CardTitle>Monthly Trend (12 months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={(() => {
                    const months = new Set([...trend.created.map((c: any) => c.month), ...trend.completed.map((c: any) => c.month)]);
                    return [...months].sort().map((m) => ({
                      month: m,
                      created: trend.created.find((c: any) => c.month === m)?.count || 0,
                      completed: trend.completed.find((c: any) => c.month === m)?.count || 0,
                    }));
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sla">
          {sla && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {Object.entries(sla.slaData as Record<string, any>).map(([priority, d]) => (
                  <Card key={priority}>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{priority}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Target</span><span>{sla.slaTargets[priority]} days</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span>{d.total}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Met SLA</span><Badge variant={d.total > 0 && d.met / d.total >= 0.8 ? "default" : "destructive"}>{d.met}/{d.total}</Badge></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Avg Days</span><span>{d.avgDays}</span></div>
                      {d.total > 0 && (
                        <div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${(d.met / d.total) * 100}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{Math.round((d.met / d.total) * 100)}% compliance</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="org">
          {org && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Requests by Organization</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={org.byOrg} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="org" type="category" width={60} /><Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Org × Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[300px]">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="text-left p-2">Org</th><th className="text-left p-2">Status</th><th className="text-right p-2">Count</th></tr></thead>
                      <tbody>
                        {org.crossTab.map((r: any, i: number) => (
                          <tr key={i} className="border-b"><td className="p-2">{r.org}</td><td className="p-2"><Badge variant="outline" className="text-xs">{r.status}</Badge></td><td className="p-2 text-right">{r.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="field">
          {field && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Requests by MDM Field</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={field.byField} layout="vertical" margin={{ left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="field" type="category" width={120} tick={{ fontSize: 12 }} /><Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {field.byField.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Field × Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b"><th className="text-left p-2">Field</th><th className="text-left p-2">Status</th><th className="text-right p-2">Count</th></tr></thead>
                      <tbody>
                        {field.fieldStatus.map((r: any, i: number) => (
                          <tr key={i} className="border-b"><td className="p-2">{r.field}</td><td className="p-2"><Badge variant="outline" className="text-xs">{r.status}</Badge></td><td className="p-2 text-right">{r.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
