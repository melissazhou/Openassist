import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Shield, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">OpenAssist</span>
            <Badge variant="secondary" className="ml-2">MDM</Badge>
          </div>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Master Data Management
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Enterprise-grade platform for managing master data change requests,
            approvals, and data quality governance.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, title: "Change Requests", desc: "Track and manage all master data changes" },
            { icon: Users, title: "Approval Workflows", desc: "Multi-level approval with auto-routing" },
            { icon: Shield, title: "Data Quality", desc: "Automated validation and quality rules" },
            { icon: BarChart3, title: "Analytics", desc: "Real-time dashboards and reporting" },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <item.icon className="h-8 w-8 text-primary" />
                <CardTitle className="mt-2">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
