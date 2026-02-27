"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LayoutDashboard, FileText, BarChart3, Settings, Search } from "lucide-react";

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Change Requests", href: "/dashboard/requests", icon: FileText },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/requests?search=${encodeURIComponent(search)}&pageSize=5`);
        const data = await res.json();
        setResults(data.items || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const navigate = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <Command className="rounded-lg border-none">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Search requests or navigate..."
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onValueChange={setSearch}
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Pages">
              {pages.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())).map((page) => (
                <Command.Item
                  key={page.href}
                  onSelect={() => navigate(page.href)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-selected:bg-muted"
                >
                  <page.icon className="h-4 w-4" />
                  {page.name}
                </Command.Item>
              ))}
            </Command.Group>

            {results.length > 0 && (
              <Command.Group heading="Change Requests">
                {results.map((item: any) => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => navigate(`/dashboard/requests/${item.id}`)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted aria-selected:bg-muted"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-xs text-primary">{item.requestNumber}</span>
                    <span className="truncate">{item.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
