"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Clock, User, Tag, FileText, Trash2, Paperclip, Upload, X, CheckCircle, XCircle, Edit, MessageSquare, GitCommit } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";

const STATUSES = [
  "NEW", "PENDING_REVIEW", "IN_PROGRESS", "PENDING_APPROVAL",
  "APPROVED", "REJECTED", "COMPLETED", "CANCELLED",
];

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: cr, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const res = await fetch(`/api/requests/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      toast.success("Status updated");
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/requests/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      setComment("");
      toast.success("Comment added");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/requests/${id}/submit`, { method: "POST" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      toast.success("Submitted for approval");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const approveMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      const res = await fetch(`/api/requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: "" }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      toast.success(action === "approve" ? "Approved" : "Rejected");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/requests/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
    },
    onSuccess: () => {
      toast.success("Request deleted");
      router.push("/dashboard/requests");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  if (!cr) return <div className="py-8 text-center text-muted-foreground">Request not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/requests">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{cr.requestNumber}</h1>
          <p className="text-muted-foreground">{cr.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cr.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="mt-1">{cr.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {cr.itemCode && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Item Code</p>
                    <p className="mt-1 font-mono">{cr.itemCode}</p>
                  </div>
                )}
                {cr.oldValue && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Old Value</p>
                    <p className="mt-1">{cr.oldValue}</p>
                  </div>
                )}
                {cr.newValue && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">New Value</p>
                    <p className="mt-1">{cr.newValue}</p>
                  </div>
                )}
                {cr.targetSystems?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target Systems</p>
                    <div className="mt-1 flex gap-1">
                      {cr.targetSystems.map((s: string) => (
                        <Badge key={s} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Comments ({cr.comments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cr.comments?.map((c: any) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{c.author?.displayName}</span>
                    <span className="text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{c.content}</p>
                </div>
              ))}
              <Separator />
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  disabled={!comment.trim() || addComment.isPending}
                  onClick={() => addComment.mutate()}
                >
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({cr.attachments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cr.attachments?.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between rounded border p-2">
                  <a href={`/api/attachments/${att.id}`} className="text-sm text-primary hover:underline truncate">
                    {att.filename}
                  </a>
                  <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                    {(att.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("file", file);
                    try {
                      const res = await fetch(`/api/requests/${id}/attachments`, { method: "POST", body: fd });
                      if (!res.ok) throw new Error("Upload failed");
                      queryClient.invalidateQueries({ queryKey: ["request", id] });
                      toast.success("File uploaded");
                    } catch { toast.error("Upload failed"); }
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                  <Upload className="mr-2 h-4 w-4" />Upload File
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          {cr.auditLogs?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {cr.auditLogs.map((log: any, i: number) => {
                    const isLast = i === cr.auditLogs.length - 1;
                    const icon = log.action === "APPROVE" ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                                 log.action === "REJECT" ? <XCircle className="h-4 w-4 text-red-500" /> :
                                 log.action === "UPDATE" ? <Edit className="h-4 w-4 text-blue-500" /> :
                                 log.action === "CREATE" ? <FileText className="h-4 w-4 text-purple-500" /> :
                                 log.action === "DELETE" ? <Trash2 className="h-4 w-4 text-red-500" /> :
                                 <Clock className="h-4 w-4 text-muted-foreground" />;
                    const changes = log.changes as Record<string, any> | null;
                    let detail = "";
                    if (changes?.previousStatus && changes?.newStatus) {
                      detail = `${changes.previousStatus.replace(/_/g, " ")} → ${changes.newStatus.replace(/_/g, " ")}`;
                    } else if (changes?.status) {
                      detail = `Status → ${changes.status.replace(/_/g, " ")}`;
                    } else if (log.action === "CREATE") {
                      detail = "Request created";
                    }
                    return (
                      <div key={log.id} className="flex gap-3 pb-4 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border bg-background">
                            {icon}
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <p className="text-sm font-medium">{log.action.replace(/_/g, " ")}</p>
                          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Select value={cr.status} onValueChange={(v) => updateStatus.mutate(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">MDM Field</p>
                <Badge variant="outline" className="mt-1">{cr.fieldLabel || cr.mdmField?.replace(/_/g, " ") || "-"}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="mt-1">{cr.category?.replace(/_/g, " ")}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                <Badge variant="outline" className="mt-1">{cr.priority}</Badge>
              </div>
              {cr.risk && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Risk</p>
                  <Badge variant={cr.risk === "High" ? "destructive" : "outline"} className="mt-1">{cr.risk}</Badge>
                </div>
              )}
              {cr.orgs?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organizations</p>
                  <div className="mt-1 flex gap-1">{cr.orgs.map((o: string) => <Badge key={o} variant="secondary">{o}</Badge>)}</div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <p className="mt-1 text-sm">{cr.source}{cr.sourceStatus ? ` (${cr.sourceStatus})` : ""}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requestor</p>
                <p className="mt-1 text-sm">{cr.requestor?.displayName || cr.requestorName || "-"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assigned To</p>
                <p className="mt-1 text-sm">{cr.assignedTo?.displayName || cr.assignedToName || "Unassigned"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="mt-1 text-sm">{new Date(cr.createdAt).toLocaleString()}</p>
              </div>
              {cr.completedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="mt-1 text-sm">{new Date(cr.completedAt).toLocaleString()}</p>
                </div>
              )}
              {/* Workflow Actions */}
              {["NEW", "IN_PROGRESS", "REJECTED"].includes(cr.status) && (
                <>
                  <Separator />
                  <Button className="w-full" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                    Submit for Approval
                  </Button>
                </>
              )}
              {cr.status === "PENDING_APPROVAL" && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-red-600" onClick={() => approveMutation.mutate("reject")}>
                      Reject
                    </Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => approveMutation.mutate("approve")}>
                      Approve
                    </Button>
                  </div>
                </>
              )}
              <Separator />
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />Delete Request
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Change Request</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete {cr.requestNumber}? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
