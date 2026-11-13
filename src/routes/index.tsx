import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db } from "@/lib/db/db";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Package,
  Landmark,
  FileText,
  TrendingDown,
  BarChart2,
  Settings,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Home,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Server-side: always allow, client handles mobile detection
  },
  component: RootPage,
});

function RootPage() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent);
    }
    return false;
  });

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768 || /Android|iPhone|iPad/i.test(navigator.userAgent);
      setIsMobile(mobile);
      if (!mobile) {
        navigate({ to: "/apps", replace: true });
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [navigate]);

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-[#1B2D6B] flex flex-col items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wider uppercase opacity-80">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  return <MobileHomeScreen />;
}

function MobileHomeScreen() {
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: () => db.getInventory() });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: () => db.getCustomers() });
  const invoicesQuery = useQuery({ queryKey: ["invoices"], queryFn: () => db.getInvoices() });
  const settings = db.getSettings();
  const shopName = settings?.shop_name || "MSS Ponkumar Store";

  const inventory = inventoryQuery.data || [];
  const customers = customersQuery.data || [];
  const invoices = invoicesQuery.data || [];

  const lowStockCount = inventory.filter(i => i.stock_qty <= (i.min_stock_alert || 10)).length;
  const totalDue = customers.reduce((s, c) => s + (c.balance_due || 0), 0);
  const todayInvoices = invoices.filter(inv => {
    const d = new Date(inv.created_at);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
  const todaySales = todayInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1B2D6B] to-[#0F1A3D] flex flex-col pb-24">
      {/* Header */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <img src="/mss-logo.png" alt="Logo" className="h-12 w-12 rounded-2xl bg-white p-1 object-contain shadow-lg" />
          <div>
            <div className="text-white/70 text-xs font-semibold tracking-wide">{greeting} 👋</div>
            <div className="text-white text-lg font-black leading-tight truncate max-w-[200px]">{shopName}</div>
          </div>
        </div>

        {/* Today's Sales Banner */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-white/60 text-xs font-semibold uppercase tracking-wide">Today's Sales</div>
            <div className="text-white text-2xl font-black">₹{todaySales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="text-white/50 text-xs">{todayInvoices.length} bills today</div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center">
            <BarChart2 className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      {/* Alert Cards */}
      {(lowStockCount > 0 || totalDue > 0) && (
        <div className="px-5 mb-4 space-y-2">
          {lowStockCount > 0 && (
            <Link to="/low-stock" className="flex items-center gap-3 bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 active:scale-98">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-amber-300 text-sm font-bold">{lowStockCount} items below stock threshold</div>
                <div className="text-amber-400/70 text-xs">Tap to view low stock alert</div>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
            </Link>
          )}
          {totalDue > 0 && (
            <Link to="/ledger" className="flex items-center gap-3 bg-red-500/20 border border-red-400/40 rounded-xl p-3 active:scale-98">
              <Landmark className="h-5 w-5 text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-red-300 text-sm font-bold">₹{totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total khata due</div>
                <div className="text-red-400/70 text-xs">Tap to view customer ledger</div>
              </div>
              <ChevronRight className="h-4 w-4 text-red-400 shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="px-5 mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Products", value: inventory.length, color: "text-teal-300", bg: "bg-teal-500/15 border-teal-500/30" },
          { label: "Customers", value: customers.length, color: "text-purple-300", bg: "bg-purple-500/15 border-purple-500/30" },
          { label: "Invoices", value: invoices.length, color: "text-sky-300", bg: "bg-sky-500/15 border-sky-500/30" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 border ${s.bg} text-center`}>
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-white/50 text-[10px] font-semibold uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Menu Grid */}
      <div className="px-5">
        <div className="text-white/50 text-[11px] font-bold uppercase tracking-widest mb-3">Quick Access</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Invoices", desc: "Bill history & status", to: "/invoices", icon: FileText, color: "from-cyan-500 to-blue-600", iconColor: "text-white" },
            { label: "Customers", desc: "Clients & khata", to: "/customers", icon: Users, color: "from-purple-500 to-violet-600", iconColor: "text-white" },
            { label: "Inventory", desc: "Products & stock", to: "/inventory", icon: Package, color: "from-teal-500 to-emerald-600", iconColor: "text-white" },
            { label: "Khata / Ledger", desc: "Credit & payments", to: "/ledger", icon: Landmark, color: "from-amber-500 to-orange-600", iconColor: "text-white" },
            { label: "Low Stock Alert", desc: "Below threshold items", to: "/low-stock", icon: TrendingDown, color: "from-red-500 to-rose-600", iconColor: "text-white" },
            { label: "Reports", desc: "Sales & analytics", to: "/reports", icon: BarChart2, color: "from-indigo-500 to-purple-600", iconColor: "text-white" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="rounded-2xl bg-white/8 border border-white/15 p-4 flex flex-col gap-3 active:scale-95 transition-transform"
              >
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${item.color} grid place-items-center shadow-lg`}>
                  <Icon className={`h-5 w-5 ${item.iconColor}`} />
                </div>
                <div>
                  <div className="text-white text-sm font-bold leading-tight">{item.label}</div>
                  <div className="text-white/50 text-xs mt-0.5 leading-snug">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0F1A3D]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2">
          {[
            { label: "Home", icon: Home, to: "/", active: true },
            { label: "Customers", icon: Users, to: "/customers", active: false },
            { label: "Inventory", icon: Package, to: "/inventory", active: false },
            { label: "Ledger", icon: BookOpen, to: "/ledger", active: false },
            { label: "Settings", icon: Settings, to: "/settings", active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px]"
              >
                <Icon className={`h-5 w-5 ${item.active ? "text-[#E8151B]" : "text-white/50"}`} />
                <span className={`text-[10px] font-semibold ${item.active ? "text-[#E8151B]" : "text-white/50"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
