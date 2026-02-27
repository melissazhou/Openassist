"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Plus, Search, Download, Upload, Kanban, ArrowUpDown, ArrowUp, ArrowDown,
  MoreHorizontal, Eye, CheckCircle, XCircle, Columns3, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  PENDING_APPROVAL: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const CATEGORIES = [
  "ITEM_MASTER", "BOM", "ROUTING", "VENDOR", "CUSTOMER",
  "PRICE", "WAREHOUSE", "SYSTEM_CONFIG", "OTHER",
];
const STATUSES = [
  "NEW", "PENDING_REVIEW", "IN_PROGRESS", "PENDING_APPROVAL",
  "APPROVED", "REJECTED", "COMPLETED", "CANCELLED",
];
const MDM_FIELDS = [
  "item_status", "buyer_code", "pallet_config", "bom", "moq",
  "lead_time", "vendor", "sourcing_rule", "formula", "upc_code",
  "rounding_mult", "foq", "misc", "other",
];
const ORGS = ["AND", "DDR", "WOD", "PHL", "IVC", "IVCN"];

function SortHeader({ column, children }: { column: any; children: React.ReactNode }) {
  const sorted = column.getIsSorted();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 font-medium"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {children}
      {sorted === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> :
       sorted === "desc" ? <ArrowDown className="ml-1 h-3 w-3" /> :
       <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
    </Button>
  );
}

async function fetchRequests(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/requests?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mdmFieldFilter, setMdmFieldFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams: Record<string, string> = { page: String(page), pageSize: "20" };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (statusFilter) queryParams.status = statusFilter;
  if (categoryFilter) queryParams.category = categoryFilter;
  if (mdmFieldFilter) queryParams.mdmField = mdmFieldFilter;
  if (orgFilter) queryParams.org = orgFilter;

  const { data, isLoading } = useQuery({
    queryKey: ["requests", queryParams],
    queryFn: () => fetchRequests(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed to create"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setDialogOpen(false);
      toast.success("Change request created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const batchStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      return { ok, total: ids.length };
    },
    onSuccess: ({ ok, total }) => {
      toast.success(`Updated ${ok}/${total} requests`);
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/requests/${id}`, { method: "DELETE" }))
      );
      return results.filter((r) => r.status === "fulfilled").length;
    },
    onSuccess: (ok) => {
      toast.success(`Deleted ${ok} requests`);
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: "requestNumber",
      header: ({ column }) => <SortHeader column={column}>Number</SortHeader>,
      cell: ({ row }) => (
        <Link href={`/dashboard/requests/${row.original.id}`} className="font-mono text-sm text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}>
          {row.getValue("requestNumber")}
        </Link>
      ),
      size: 140,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <SortHeader column={column}>Title</SortHeader>,
      cell: ({ row }) => (
        <span className="max-w-[300px] truncate block">{row.getValue("title")}</span>
      ),
    },
    {
      id: "mdmField",
      accessorFn: (row) => row.fieldLabel || row.mdmField?.replace(/_/g, " ") || row.category?.replace(/_/g, " "),
      header: ({ column }) => <SortHeader column={column}>MDM Field</SortHeader>,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs">{getValue() as string}</Badge>
      ),
      size: 140,
    },
    {
      id: "orgs",
      accessorFn: (row) => row.orgs?.join(", ") || "-",
      header: "Org",
      size: 80,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <SortHeader column={column}>Priority</SortHeader>,
      cell: ({ getValue }) => {
        const p = getValue() as string;
        return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[p] || ""}`}>{p}</span>;
      },
      size: 100,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortHeader column={column}>Status</SortHeader>,
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s] || ""}`}>{s.replace(/_/g, " ")}</span>;
      },
      size: 140,
    },
    {
      id: "requestor",
      accessorFn: (row) => row.requestor?.displayName || row.requestorName || "-",
      header: ({ column }) => <SortHeader column={column}>Requestor</SortHeader>,
      size: 120,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortHeader column={column}>Created</SortHeader>,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(getValue() as string).toLocaleDateString()}
        </span>
      ),
      size: 100,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/dashboard/requests/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" />View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => quickStatus(row.original.id, "APPROVED")}>
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => quickStatus(row.original.id, "REJECTED")}>
              <XCircle className="mr-2 h-4 w-4 text-red-600" />Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      size: 50,
    },
  ];

  const table = useReactTable({
    data: data?.items || [],
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  const selectedIds = Object.keys(rowSelection);
  const hasSelection = selectedIds.length > 0;

  function quickStatus(id: string, status: string) {
    fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(() => {
      toast.success(`Status updated to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    }).catch(() => toast.error("Failed to update status"));
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      title: fd.get("title"),
      description: fd.get("description"),
      category: fd.get("category"),
      priority: fd.get("priority"),
      itemCode: fd.get("itemCode") || undefined,
      oldValue: fd.get("oldValue") || undefined,
      newValue: fd.get("newValue") || undefined,
      requestorName: fd.get("requestorName") || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Change Requests</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total requests</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/requests/kanban">
            <Button variant="outline" size="sm"><Kanban className="mr-2 h-4 w-4" />Kanban</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.open("/api/requests/import", "_blank")}>Template</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-2 h-4 w-4" />Import</Button>
          <Button variant="outline" onClick={() => {
            const qs = new URLSearchParams();
            if (statusFilter) qs.set("status", statusFilter);
            if (categoryFilter) qs.set("category", categoryFilter);
            window.open(`/api/requests/export?${qs}`, "_blank");
          }}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Change Request</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" name="title" required placeholder="Describe the change needed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <select name="category" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <select name="priority" defaultValue="MEDIUM" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} placeholder="Additional details..." />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Item Code</Label><Input name="itemCode" placeholder="e.g. FG-10001" /></div>
                  <div className="space-y-2"><Label>Old Value</Label><Input name="oldValue" placeholder="Current value" /></div>
                  <div className="space-y-2"><Label>New Value</Label><Input name="newValue" placeholder="Desired value" /></div>
                </div>
                <div className="space-y-2">
                  <Label>Requestor Name</Label>
                  <Input name="requestorName" placeholder="Who requested this change" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Import Change Requests</DialogTitle></DialogHeader>
              <p className="text-sm text-muted-foreground">
                Paste CSV data (with header row). Required: title. Optional: category, priority, itemCode, oldValue, newValue, targetSystems, requestorName, description.
              </p>
              <Textarea id="import-csv" rows={8} placeholder="title,category,priority,itemCode&#10;Update BOM for FG-100,BOM,HIGH,FG-100" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  const csv = (document.getElementById("import-csv") as HTMLTextAreaElement)?.value;
                  if (!csv?.trim()) return;
                  const lines = csv.trim().split("\n");
                  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
                  const rows = lines.slice(1).map(line => {
                    const vals = line.match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, "").trim()) || [];
                    const obj: any = {};
                    headers.forEach((h, i) => { if (vals[i]) obj[h] = vals[i]; });
                    return obj;
                  }).filter(r => r.title);
                  try {
                    const res = await fetch("/api/requests/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
                    const data = await res.json();
                    toast.success(`Imported ${data.created} requests` + (data.errors?.length ? `, ${data.errors.length} errors` : ""));
                    queryClient.invalidateQueries({ queryKey: ["requests"] });
                    setImportOpen(false);
                  } catch { toast.error("Import failed"); }
                }}>Import</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters + Column Visibility + Batch Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by title, number, item code..." className="pl-9" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={mdmFieldFilter} onValueChange={(v) => { setMdmFieldFilter(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Fields" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Fields</SelectItem>
                {MDM_FIELDS.map((f) => <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={orgFilter} onValueChange={(v) => { setOrgFilter(v === "ALL" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="All Orgs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Orgs</SelectItem>
                {ORGS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Columns3 className="mr-2 h-4 w-4" />Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllLeafColumns()
                  .filter((col) => col.id !== "select" && col.id !== "actions")
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    >
                      {col.id === "requestNumber" ? "Number" :
                       col.id === "mdmField" ? "MDM Field" :
                       col.id === "orgs" ? "Org" :
                       col.id === "requestor" ? "Requestor" :
                       col.id === "createdAt" ? "Created" :
                       col.id.charAt(0).toUpperCase() + col.id.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Batch Action Bar */}
          {hasSelection && (
            <div className="flex items-center gap-3 mt-4 p-3 rounded-md bg-muted/50 border">
              <span className="text-sm font-medium">{selectedIds.length} selected</span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">Set Status</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {STATUSES.map((s) => (
                      <DropdownMenuItem key={s} onClick={() => {
                        if (confirm(`Set ${selectedIds.length} requests to "${s.replace(/_/g, " ")}"?`))
                          batchStatusMutation.mutate({ ids: selectedIds, status: s });
                      }}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[s]?.split(" ")[0] || ""}`} />
                        {s.replace(/_/g, " ")}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="destructive" size="sm"
                  onClick={() => { if (confirm(`Delete ${selectedIds.length} requests?`)) batchDeleteMutation.mutate(selectedIds); }}>
                  <Trash2 className="mr-1 h-3 w-3" />Delete
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TanStack Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 opacity-30" />
                      <p>No change requests found</p>
                      <p className="text-xs">Try adjusting your filters or create a new request</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => router.push(`/dashboard/requests/${row.original.id}`)}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} total)
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#"
                  onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
              {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                let p: number;
                if (data.totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= data.totalPages - 2) p = data.totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <PaginationItem key={p}>
                    <PaginationLink href="#" isActive={p === page}
                      onClick={(e) => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                  </PaginationItem>
                );
              })}
              {data.totalPages > 5 && page < data.totalPages - 2 && (
                <PaginationItem><PaginationEllipsis /></PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext href="#"
                  onClick={(e) => { e.preventDefault(); if (page < data.totalPages) setPage(page + 1); }}
                  className={page >= data.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
