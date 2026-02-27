"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const MDM_FIELDS = [
  { field: "item_status", label: "Status Change", category: "ITEM_MASTER", system: "PLM/EBS", description: "Item lifecycle status transitions (Active → DISC, Suspend, etc.)", examples: "Active, DISC, Suspended, Approved" },
  { field: "buyer_code", label: "Buyer/Planner Update", category: "ITEM_MASTER", system: "EBS", description: "Buyer or planner assignment changes", examples: "INTERNAL, buyer name" },
  { field: "pallet_config", label: "Pallet Config Update", category: "ITEM_MASTER", system: "PLM", description: "Pallet configuration: layers, cases per layer, shippers per pallet", examples: "13/7, layers=15, cases/layer=7" },
  { field: "bom", label: "BOM Update", category: "BOM", system: "PLM/EBS", description: "Bill of Materials changes: components, labels, shippers", examples: "Label change, shipper update" },
  { field: "moq", label: "MOQ Update", category: "ITEM_MASTER", system: "EBS", description: "Minimum Order Quantity changes", examples: "3500, 5000 kg" },
  { field: "lead_time", label: "Lead Time Update", category: "ITEM_MASTER", system: "EBS", description: "Manufacturing or procurement lead time changes", examples: "10 days, 70 days" },
  { field: "vendor", label: "Vendor Update", category: "VENDOR", system: "EBS", description: "Vendor/supplier assignment or attribute changes", examples: "Vendor name, supplier code" },
  { field: "sourcing_rule", label: "Sourcing Rule", category: "ITEM_MASTER", system: "EBS", description: "Sourcing rule configuration changes", examples: "Primary source, split sourcing" },
  { field: "formula", label: "Formula/MBR Upload", category: "BOM", system: "PLM/EBS", description: "Master Batch Record or Master Control Record uploads", examples: "MBR, MCR, recipe" },
  { field: "upc_code", label: "UPC Update", category: "ITEM_MASTER", system: "EBS", description: "UPC/UCC barcode assignment or changes", examples: "UPC-A, UCC-128" },
  { field: "rounding_mult", label: "Rounding Multiple Update", category: "ITEM_MASTER", system: "EBS", description: "Order rounding multiple changes for scheduling", examples: "100, 500" },
  { field: "foq", label: "FOQ Update", category: "ITEM_MASTER", system: "EBS", description: "Fixed Order Quantity changes", examples: "10000, 25000" },
  { field: "misc", label: "Miscellaneous", category: "OTHER", system: "EBS", description: "Special requests not fitting standard categories", examples: "Various" },
  { field: "other", label: "Other", category: "OTHER", system: "EBS", description: "Unclassified or new request types", examples: "Various" },
];

const ORGS = [
  { code: "AND", name: "Anderson (DC)", type: "Distribution Center", description: "Main distribution center operations" },
  { code: "DDR", name: "DDR Manufacturing", type: "Manufacturing", description: "Primary manufacturing org for supplements" },
  { code: "WOD", name: "WOD Manufacturing", type: "Manufacturing", description: "Secondary manufacturing org" },
  { code: "PHL", name: "PHL", type: "Manufacturing", description: "Philadelphia operations" },
  { code: "IVC", name: "IVC Main", type: "Corporate", description: "IVC corporate org" },
  { code: "IVCN", name: "IVCN", type: "Corporate", description: "IVC North" },
];

const STATUSES = [
  { status: "NEW", description: "Newly created, awaiting review", next: ["IN_PROGRESS", "PENDING_APPROVAL", "CANCELLED"] },
  { status: "PENDING_REVIEW", description: "Under initial review by MDM team", next: ["IN_PROGRESS", "REJECTED"] },
  { status: "IN_PROGRESS", description: "Being worked on by assigned analyst", next: ["PENDING_APPROVAL", "CANCELLED"] },
  { status: "PENDING_APPROVAL", description: "Awaiting manager/lead approval", next: ["APPROVED", "REJECTED"] },
  { status: "APPROVED", description: "Approved, ready for execution in target systems", next: ["COMPLETED"] },
  { status: "REJECTED", description: "Rejected with reason, can be resubmitted", next: ["NEW", "CANCELLED"] },
  { status: "COMPLETED", description: "Executed and verified in all target systems", next: [] },
  { status: "CANCELLED", description: "Cancelled by requestor or admin", next: [] },
];

const SYSTEMS = [
  { code: "EBS", name: "Oracle E-Business Suite", description: "Item master, BOM, purchasing, planning, inventory" },
  { code: "PLM", name: "Product Lifecycle Management", description: "Formulas, MBR/MCR, pallet configs, packaging specs" },
  { code: "WMS", name: "IWMS Warehouse Management", description: "Warehouse operations, lot status, inventory" },
];

export default function DictionaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Dictionary</h1>
        <p className="text-muted-foreground">MDM field definitions, organizations, statuses, and target systems</p>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">MDM Fields ({MDM_FIELDS.length})</TabsTrigger>
          <TabsTrigger value="orgs">Organizations ({ORGS.length})</TabsTrigger>
          <TabsTrigger value="statuses">Status Flow ({STATUSES.length})</TabsTrigger>
          <TabsTrigger value="systems">Target Systems ({SYSTEMS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field ID</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Examples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MDM_FIELDS.map((f) => (
                    <TableRow key={f.field}>
                      <TableCell className="font-mono text-sm">{f.field}</TableCell>
                      <TableCell className="font-medium">{f.label}</TableCell>
                      <TableCell><Badge variant="outline">{f.category}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{f.system}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[250px]">{f.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.examples}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orgs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORGS.map((o) => (
                    <TableRow key={o.code}>
                      <TableCell><Badge>{o.code}</Badge></TableCell>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell><Badge variant="outline">{o.type}</Badge></TableCell>
                      <TableCell className="text-sm">{o.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Allowed Transitions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {STATUSES.map((s) => (
                    <TableRow key={s.status}>
                      <TableCell><Badge>{s.status.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{s.description}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {s.next.length > 0 ? s.next.map((n) => (
                            <Badge key={n} variant="outline" className="text-xs">{n.replace(/_/g, " ")}</Badge>
                          )) : <span className="text-sm text-muted-foreground">Terminal</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="systems">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>System</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SYSTEMS.map((s) => (
                    <TableRow key={s.code}>
                      <TableCell><Badge variant="secondary">{s.code}</Badge></TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
