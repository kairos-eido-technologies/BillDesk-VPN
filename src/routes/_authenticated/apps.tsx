import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { KairosLogo } from "@/components/KairosLogo";
import {
  LayoutDashboard,
  ScanBarcode,
  Receipt,
  FileText,
  Package,
  Users,
  Landmark,
  LineChart,
  Settings,
  Search,
  Server,
} from "lucide-react";
import { useT } from "@/lib/lang/lang-context";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsPage,
});

export type SingleApp = {
  id: string;
  name: string;
  category: string;
  desc: string;
  to: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
};

export const INDIVIDUAL_APPS: SingleApp[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    category: "Analytics",
    desc: "Overview & Metrics",
    to: "/dashboard",
    icon: LayoutDashboard,
    color: "text-sky-400",
    bgColor: "from-sky-500/25 to-blue-600/15",
    borderColor: "border-sky-500/40",
  },
  {
    id: "pos",
    name: "POS Billing",
    category: "Sales",
    desc: "Rapid Checkout",
    to: "/pos",
    icon: ScanBarcode,
    color: "text-blue-400",
    bgColor: "from-blue-500/30 to-indigo-600/15",
    borderColor: "border-blue-500/40",
  },
  {
    id: "invoices",
    name: "Invoices",
    category: "Sales",
    desc: "Bill History & Status",
    to: "/invoices",
    icon: Receipt,
    color: "text-cyan-400",
    bgColor: "from-cyan-500/25 to-blue-600/15",
    borderColor: "border-cyan-500/40",
  },
  {
    id: "billing",
    name: "Billing Hub",
    category: "Sales",
    desc: "Standard Invoicing",
    to: "/billing",
    icon: FileText,
    color: "text-indigo-400",
    bgColor: "from-indigo-500/25 to-blue-600/15",
    borderColor: "border-indigo-500/40",
  },
  {
    id: "inventory",
    name: "Inventory",
    category: "Stock",
    desc: "Products & Stock",
    to: "/inventory",
    icon: Package,
    color: "text-sky-400",
    bgColor: "from-sky-500/30 to-teal-600/15",
    borderColor: "border-sky-500/40",
  },
  {
    id: "customers",
    name: "Customers",
    category: "People",
    desc: "Clients & Balances",
    to: "/customers",
    icon: Users,
    color: "text-purple-400",
    bgColor: "from-purple-500/25 to-indigo-600/15",
    borderColor: "border-purple-500/40",
  },
  {
    id: "ledger",
    name: "Customer Ledger",
    category: "Finance",
    desc: "Khata & Statements",
    to: "/ledger",
    icon: Landmark,
    color: "text-amber-400",
    bgColor: "from-amber-500/25 to-yellow-600/15",
    borderColor: "border-amber-500/40",
  },
  {
    id: "server",
    name: "Server Host & VPN",
    category: "System",
    desc: "Mobile Wi-Fi & Tunnel Access",
    to: "/server",
    icon: Server,
    color: "text-emerald-400",
    bgColor: "from-emerald-500/25 to-teal-600/15",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "settings",
    name: "Settings",
    category: "System",
    desc: "Offline Store Details & Prefs",
    to: "/settings",
    icon: Settings,
    color: "text-slate-300",
    bgColor: "from-slate-500/25 to-zinc-600/15",
    borderColor: "border-slate-500/40",
  },
];

function AppsPage() {
  const t = useT();
  const [search, setSearch] = useState("");

  const apps = INDIVIDUAL_APPS.map((app) => ({
    ...app,
    name: t(`apps.${app.id}`, app.name),
  }));

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(search.toLowerCase()) ||
    app.desc.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      {/* ── Background Watermark ── */}
      <div
        className="pointer-events-none select-none fixed inset-0 flex flex-col items-center justify-center z-0"
        aria-hidden="true"
      >
        <div className="text-center flex flex-col items-center gap-1 opacity-[0.06]">
          <div
            className="font-black uppercase text-foreground"
            style={{ fontSize: "clamp(36px, 8vw, 80px)", letterSpacing: "0.3em" }}
          >
            KAIROS
          </div>
          <div
            className="font-bold uppercase text-foreground"
            style={{ fontSize: "clamp(18px, 4vw, 42px)", letterSpacing: "0.5em" }}
          >
            BILLS
          </div>
          <div
            className="font-semibold uppercase text-primary mt-1"
            style={{ fontSize: "clamp(9px, 1.5vw, 16px)", letterSpacing: "0.35em" }}
          >
            SMART CLOUD BILLING
          </div>
        </div>
      </div>

      {/* ── Foreground content ── */}
      <div className="relative z-10 flex flex-col items-center p-6 md:p-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <KairosLogo size="lg" className="mb-2" />
        </div>

        {/* Search Input */}
        <div className="w-full max-w-md mb-8">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps or tools..."
              className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition shadow-xs"
            />
          </div>
        </div>

        {/* App Grid */}
        <div className="w-full max-w-4xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-8 gap-x-6 justify-items-center">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.to as any}
                className="group flex flex-col items-center gap-3 p-3 rounded-2xl transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer focus:outline-none"
              >
                {/* App Squircle */}
                <div
                  className={`relative h-20 w-20 sm:h-22 sm:w-22 rounded-[22px] bg-gradient-to-br ${app.bgColor} border ${app.borderColor} grid place-items-center shadow-md group-hover:shadow-xl group-hover:border-primary/60 transition-all duration-200`}
                >
                  <Icon className={`h-9 w-9 sm:h-10 sm:w-10 ${app.color} drop-shadow-xs`} />
                </div>

                {/* App Name & Desc */}
                <div className="text-center">
                  <span className="text-xs sm:text-sm font-semibold text-center text-foreground group-hover:text-primary transition-colors block line-clamp-1">
                    {app.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground block line-clamp-1 mt-0.5">
                    {app.desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {filteredApps.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border p-6 max-w-sm w-full">
            <p className="text-sm text-muted-foreground">No apps found for "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-xs font-semibold text-primary underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
