"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const COLUMNS = [
  { status: "NEW", label: "New", color: "bg-blue-500" },
  { status: "IN_PROGRESS", label: "In Progress", color: "bg-purple-500" },
  { status: "PENDING_APPROVAL", label: "Pending Approval", color: "bg-orange-500" },
  { status: "APPROVED", label: "Approved", color: "bg-green-500" },
  { status: "COMPLETED", label: "Completed", color: "bg-emerald-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function KanbanPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["kanban"],
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      for (const col of COLUMNS) {
        const res = await fetch(`/api/requests?status=${col.status}&pageSize=50&sortBy=priority&sortOrder=desc`);
        const d = await res.json();
        results[col.status] = d.items || [];
      }
      return results;
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      toast.success("Status updated");
    },
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/requests">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />List View</Button>
        </Link>
        <h1 className="text-2xl font-bold">Kanban Board</h1>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = data?.[col.status] || [];
          return (
            <div key={col.status} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${col.color}`} />
                <span className="font-medium text-sm">{col.label}</span>
                <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {items.map((item: any) => (
                  <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-3 space-y-2">
                      <Link href={`/dashboard/requests/${item.id}`} className="block">
                        <p className="font-mono text-xs text-primary">{item.requestNumber}</p>
                        <p className="text-sm font-medium line-clamp-2 mt-1">{item.title}</p>
                      </Link>
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[item.priority] || ""}`}>
                          {item.priority}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.requestor?.displayName || item.requestorName || ""}
                        </span>
                      </div>
                      {/* Quick move buttons */}
                      <div className="flex gap-1 pt-1">
                        {COLUMNS.filter((c) => c.status !== col.status).slice(0, 2).map((target) => (
                          <Button
                            key={target.status}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={(e) => { e.preventDefault(); moveMutation.mutate({ id: item.id, status: target.status }); }}
                          >
                            → {target.label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
