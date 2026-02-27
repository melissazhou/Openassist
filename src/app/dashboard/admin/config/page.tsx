"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save, RefreshCw, Shield, Bell, GitBranch, Link2, Lock } from "lucide-react";

const GROUP_META: Record<string, { label: string; icon: any; description: string }> = {
  general: { label: "General", icon: Settings, description: "Application-wide settings" },
  workflow: { label: "Workflow", icon: GitBranch, description: "Change request workflow rules" },
  notification: { label: "Notifications", icon: Bell, description: "Email and alert settings" },
  integration: { label: "Integration", icon: Link2, description: "External system connections" },
  security: { label: "Security", icon: Lock, description: "Authentication and access control" },
};

export default function ConfigPage() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/config");
      if (!res.ok) throw new Error("Failed to load config");
      return res.json();
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/config/seed", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Seeded ${data.seeded} configs`);
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: { key: string; value: string }[]) => {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast.success("Configuration saved");
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
  });

  const handleSave = () => {
    const updates = Object.entries(edits).map(([key, value]) => ({ key, value }));
    if (updates.length === 0) { toast.info("No changes"); return; }
    saveMutation.mutate(updates);
  };

  const grouped = data?.grouped || {};
  const hasEdits = Object.keys(edits).length > 0;

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading configuration...</div>;

  const isEmpty = !data?.configs?.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-muted-foreground">Manage application parameters and feature flags</p>
        </div>
        <div className="flex gap-2">
          {isEmpty && (
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Initialize Defaults
            </Button>
          )}
          {hasEdits && (
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes ({Object.keys(edits).length})
            </Button>
          )}
        </div>
      </div>

      {Object.entries(GROUP_META).map(([group, meta]) => {
        const configs = grouped[group] || [];
        if (configs.length === 0 && !isEmpty) return null;
        const Icon = meta.icon;

        return (
          <Card key={group}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>{meta.label}</CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No configs. Click &quot;Initialize Defaults&quot; to seed.</p>
              ) : (
                <div className="space-y-4">
                  {configs.map((cfg: any) => (
                    <div key={cfg.key} className="flex items-center gap-4">
                      <div className="min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{cfg.label || cfg.key}</span>
                          <Badge variant="outline" className="text-xs">{cfg.type}</Badge>
                        </div>
                        {cfg.description && (
                          <p className="text-xs text-muted-foreground">{cfg.description}</p>
                        )}
                      </div>
                      <div className="flex-1 max-w-[300px]">
                        {cfg.type === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={(edits[cfg.key] ?? cfg.value) === "true"}
                              onCheckedChange={(checked) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [cfg.key]: checked ? "true" : "false",
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {(edits[cfg.key] ?? cfg.value) === "true" ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        ) : (
                          <Input
                            type={cfg.type === "number" ? "number" : "text"}
                            value={edits[cfg.key] ?? cfg.value}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [cfg.key]: e.target.value }))}
                            className="h-8"
                          />
                        )}
                      </div>
                      {edits[cfg.key] !== undefined && edits[cfg.key] !== cfg.value && (
                        <Badge variant="secondary" className="text-xs">Modified</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
