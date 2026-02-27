"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Play, Pause, Trash2, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

function StatusIcon({ status }: { status: string | null }) {
  if (status === "success") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "running") return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", cronExpr: "", handler: "", description: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/jobs");
      if (!res.ok) throw new Error("Failed to load jobs");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create job");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Job created");
      setShowCreate(false);
      setForm({ name: "", cronExpr: "", handler: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/admin/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/jobs/${id}/run`, { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      toast.success("Job triggered");
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/admin/jobs/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Job deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading jobs...</div>;

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scheduled Jobs</h1>
          <p className="text-muted-foreground">{jobs.length} jobs configured</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Scheduled Job</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="SharePoint Sync" /></div>
              <div><Label>Cron Expression</Label><Input value={form.cronExpr} onChange={(e) => setForm((f) => ({ ...f, cronExpr: e.target.value }))} placeholder="*/10 * * * *" /><p className="text-xs text-muted-foreground mt-1">Standard cron format (min hour dom mon dow)</p></div>
              <div><Label>Handler</Label><Input value={form.handler} onChange={(e) => setForm((f) => ({ ...f, handler: e.target.value }))} placeholder="sharepoint-sync" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Sync MDM requests from SharePoint" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.cronExpr || !form.handler}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {jobs.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No scheduled jobs yet. Create one to get started.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job: any) => (
            <Card key={job.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={job.lastStatus} />
                    <div>
                      <CardTitle className="text-base">{job.name}</CardTitle>
                      {job.description && <p className="text-sm text-muted-foreground">{job.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.enabled ? "default" : "secondary"}>
                      {job.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">{job.cronExpr}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span>Handler: <code className="text-foreground">{job.handler}</code></span>
                    {job.lastRunAt && <span>Last run: {new Date(job.lastRunAt).toLocaleString()}</span>}
                    {job.lastStatus && <span>Status: {job.lastStatus}</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => runMutation.mutate(job.id)} disabled={runMutation.isPending}>
                      <Play className="mr-1 h-3 w-3" />Run
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate({ id: job.id, enabled: !job.enabled })}>
                      {job.enabled ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
                      {job.enabled ? "Disable" : "Enable"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { if (confirm("Delete this job?")) deleteMutation.mutate(job.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Recent runs */}
                {job.runs?.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Recent Runs</p>
                    <div className="space-y-1">
                      {job.runs.map((run: any) => (
                        <div key={run.id} className="flex items-center gap-3 text-xs">
                          <StatusIcon status={run.status} />
                          <span>{new Date(run.startedAt).toLocaleString()}</span>
                          {run.duration != null && <span className="text-muted-foreground">{run.duration}ms</span>}
                          {run.error && <span className="text-red-500 truncate max-w-[300px]">{run.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
