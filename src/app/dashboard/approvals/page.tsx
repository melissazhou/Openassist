"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import Link from "next/link";

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: string; action: string; comment: string }) => {
      const res = await fetch(`/api/requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      setSelectedId(null);
      setComment("");
      toast.success(vars.action === "approve" ? "Request approved" : "Request rejected");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openDialog = (id: string, action: "approve" | "reject") => {
    setSelectedId(id);
    setActionType(action);
    setComment("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Approval Center</h1>
          <p className="text-muted-foreground">{items?.length || 0} pending approvals</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      ) : items?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No pending approvals at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items?.map((item: any) => (
            <Card key={item.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/requests/${item.id}`} className="font-mono text-primary hover:underline">
                        {item.requestNumber}
                      </Link>
                      <Badge variant="outline">{item.category?.replace(/_/g, " ")}</Badge>
                      <Badge variant={item.priority === "URGENT" ? "destructive" : item.priority === "HIGH" ? "default" : "secondary"}>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested by {item.requestor?.displayName || item.requestorName || "Unknown"}
                      {" · "}{new Date(item.createdAt).toLocaleDateString()}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openDialog(item.id, "reject")}>
                      <XCircle className="mr-1 h-4 w-4" />Reject
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                      onClick={() => openDialog(item.id, "approve")}>
                      <CheckCircle className="mr-1 h-4 w-4" />Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "approve" ? "Approve" : "Reject"} Request</DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This will mark the request as approved."
                : "This will reject the request. Please provide a reason."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={actionType === "approve" ? "Optional comment..." : "Reason for rejection..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              disabled={approveMutation.isPending || (actionType === "reject" && !comment.trim())}
              onClick={() => {
                if (selectedId) approveMutation.mutate({ id: selectedId, action: actionType, comment });
              }}
            >
              {approveMutation.isPending ? "Processing..." : actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
