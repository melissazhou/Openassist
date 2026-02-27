"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Database, FileText, AlertTriangle } from "lucide-react";
import Link from "next/link";

const ORGS = ["AND", "DDR", "WOD", "PHL", "IVC"];

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [org, setOrg] = useState("AND");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Search results
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["item-search", activeSearch, org],
    queryFn: async () => {
      const res = await fetch(`/api/items/search?q=${encodeURIComponent(activeSearch)}&org=${org}`);
      return res.json();
    },
    enabled: activeSearch.length >= 3,
  });

  // Item detail
  const { data: itemDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["item-detail", selectedItem],
    queryFn: async () => {
      const res = await fetch(`/api/items/${selectedItem}`);
      return res.json();
    },
    enabled: !!selectedItem,
  });

  const handleSearch = () => {
    if (searchTerm.length >= 3) {
      setActiveSearch(searchTerm);
      setSelectedItem(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Item Master Query</h1>
        <p className="text-muted-foreground">Search EBS/PLM item data and view related change requests</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Select value={org} onValueChange={setOrg}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORGS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by item number (e.g. 5500383, FG-10001, RM3300846)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searchTerm.length < 3}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {activeSearch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              EBS Results {searchResults?.count !== undefined && `(${searchResults.count})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {searchResults?.error ? (
              <div className="flex items-center gap-2 text-orange-600 py-4">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Cannot connect to EBS database</p>
                  <p className="text-sm text-muted-foreground">{searchResults.detail}</p>
                  <p className="text-sm mt-1">This feature requires VPN connection to the corporate network.</p>
                </div>
              </div>
            ) : searching ? (
              <p className="py-4 text-muted-foreground">Searching EBS...</p>
            ) : searchResults?.items?.length === 0 ? (
              <p className="py-4 text-muted-foreground">No items found matching &quot;{activeSearch}&quot; in {org}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Org</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Planner</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead>Lead Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults?.items?.map((item: any, i: number) => (
                    <TableRow
                      key={i}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedItem(item.ITEM_NUMBER)}
                    >
                      <TableCell className="font-mono text-primary">{item.ITEM_NUMBER}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.DESCRIPTION}</TableCell>
                      <TableCell><Badge variant="outline">{item.ORG_CODE}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={item.ITEM_STATUS === "Active" ? "default" : "secondary"}>
                          {item.ITEM_STATUS}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.ITEM_TYPE}</TableCell>
                      <TableCell className="text-sm">{item.PLANNER_CODE || "-"}</TableCell>
                      <TableCell className="text-sm">{item.BUYER_NAME || "-"}</TableCell>
                      <TableCell className="text-sm">{item.MOQ || "-"}</TableCell>
                      <TableCell className="text-sm">{item.LEAD_TIME || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Item Detail */}
      {selectedItem && (
        <Card>
          <CardHeader>
            <CardTitle>Item Detail: {selectedItem}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <Tabs defaultValue="ebs">
                <TabsList>
                  <TabsTrigger value="ebs">EBS Data ({itemDetail?.ebs?.length || 0})</TabsTrigger>
                  <TabsTrigger value="changes">Change Requests ({itemDetail?.changeRequests?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="ebs" className="mt-4">
                  {itemDetail?.ebsError ? (
                    <p className="text-orange-600">EBS connection unavailable: {itemDetail.ebsError}</p>
                  ) : itemDetail?.ebs?.length === 0 ? (
                    <p className="text-muted-foreground">No EBS records found</p>
                  ) : (
                    <div className="space-y-4">
                      {itemDetail?.ebs?.map((row: any, i: number) => (
                        <div key={i} className="rounded border p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge>{row.ORG_CODE}</Badge>
                            <Badge variant={row.ITEM_STATUS === "Active" ? "default" : "destructive"}>
                              {row.ITEM_STATUS}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{row.ITEM_TYPE}</span>
                          </div>
                          <p className="font-medium">{row.DESCRIPTION}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div><span className="text-muted-foreground">UOM:</span> {row.UOM || "-"}</div>
                            <div><span className="text-muted-foreground">Planner:</span> {row.PLANNER_CODE || "-"}</div>
                            <div><span className="text-muted-foreground">Buyer:</span> {row.BUYER_NAME || "-"}</div>
                            <div><span className="text-muted-foreground">List Price:</span> {row.LIST_PRICE || "-"}</div>
                            <div><span className="text-muted-foreground">MOQ:</span> {row.MOQ || "-"}</div>
                            <div><span className="text-muted-foreground">FOQ:</span> {row.FOQ || "-"}</div>
                            <div><span className="text-muted-foreground">Lead Time:</span> {row.LEAD_TIME || "-"} days</div>
                            <div><span className="text-muted-foreground">Safety Stock:</span> {row.SAFETY_STOCK_DAYS || "-"} days</div>
                            <div><span className="text-muted-foreground">Weight:</span> {row.UNIT_WEIGHT || "-"} {row.WEIGHT_UOM || ""}</div>
                            <div><span className="text-muted-foreground">Rounding:</span> {row.ROUNDING_TYPE || "-"}</div>
                            <div><span className="text-muted-foreground">Last Updated:</span> {row.LAST_UPDATE ? new Date(row.LAST_UPDATE).toLocaleDateString() : "-"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="changes" className="mt-4">
                  {itemDetail?.changeRequests?.length === 0 ? (
                    <p className="text-muted-foreground">No related change requests found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request #</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Old → New</TableHead>
                          <TableHead>Org</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemDetail?.changeRequests?.map((cr: any) => (
                          <TableRow key={cr.id}>
                            <TableCell>
                              <Link href={`/dashboard/requests/${cr.id}`} className="font-mono text-primary hover:underline">
                                {cr.requestNumber}
                              </Link>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{cr.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{cr.fieldLabel || cr.mdmField}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {cr.oldValue || cr.newValue ? (
                                <span>{cr.oldValue || "—"} → {cr.newValue || "—"}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-xs">{cr.orgs?.join(", ") || "-"}</TableCell>
                            <TableCell><Badge variant="outline">{cr.status}</Badge></TableCell>
                            <TableCell className="text-sm">{new Date(cr.createdAt).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
