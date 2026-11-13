import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db } from "@/lib/db/db";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Package,
  Landmark,
  Receipt,
  FileText,
  TrendingDown,
  BarChart2,
  Settings,
  ChevronRight,
  Home,
  BookOpen,
  ShoppingBag,
  Clock,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // TanStack router loader
  },
  component: MobileAppRoot,
});

function MobileAppRoot() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    }
    return false;
  });

  useEffect(() => {
    const check = () => {
      const mobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      if (!mobile) {
        // Desktop devices navigate directly to apps workspace
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
          <span className="text-xs font-semibold tracking-wider uppercase opacity-80">
            Loading Desktop Console...
          </span>
        </div>
      </div>
    );
  }

  return <MobileDedicatedDashboard />;
}

function MobileDedicatedDashboard() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    db.loadPromise.then(() => {
      if (active) {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
    });

    db.fetchFromServer().then((ok) => {
      if (ok && active) {
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
    });

    return () => {
      active = false;
    };
  }, [queryClient]);

  const inventoryQuery = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      await db.loadPromise;
      return db.getInventory();
    },
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      await db.loadPromise;
      return db.getCustomers();
    },
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      await db.loadPromise;
      return db.getInvoices();
    },
  });

  const settings = db.getSettings();
  const shopName = settings?.shop_name || "MSS Ponkumar Store";

  const inventory = inventoryQuery.data || [];
  const customers = customersQuery.data || [];
  const invoices = invoicesQuery.data || [];

  const globalThreshold = parseInt(String(settings?.low_stock_threshold ?? "10"), 10) || 10;
  const lowStockCount = inventory.filter(
    (i) => i.stock_qty <= (i.min_stock_alert !== undefined && i.min_stock_alert !== null ? i.min_stock_alert : globalThreshold)
  ).length;

  const totalDue = customers.reduce((s, c) => s + (c.balance_due || 0), 0);

  // Match invoices from today (same calendar date OR within the last 24 hours of store operations)
  const todayInvoices = invoices.filter((inv) => {
    if (!inv.created_at) return false;
    const d = new Date(inv.created_at);
    const now = new Date();
    const isSameDate =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const isWithin24Hrs =
      now.getTime() - d.getTime() >= 0 &&
      now.getTime() - d.getTime() <= 24 * 60 * 60 * 1000;
    return isSameDate || isWithin24Hrs;
  });
  const todaySales = todayInvoices.reduce((s, inv) => s + (inv.grand_total || 0), 0);

  // Compute Today's Unique Customers and Today's Sold Items Qty
  const todayCustomersSet = new Set(
    todayInvoices.map((inv) => inv.customer_id || inv.customer_mobile || inv.customer_name).filter(Boolean)
  );
  const todayCustomersCount = todayCustomersSet.size;

  const todaySoldProductsQty = todayInvoices.reduce((acc, inv) => {
    const items =
      inv.items && inv.items.length > 0
        ? inv.items
        : (db.getStore()?.invoice_items || []).filter((it: any) => it.invoice_id === inv.id);
    return acc + items.reduce((s: number, it: any) => s + Number(it.qty || 0), 0);
  }, 0);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Recent 5 invoices
  const recentInvoices = [...invoices].slice(0, 5);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col pb-24 text-slate-800">
      {/* ── Top Hero Header (Navy Brand) ── */}
      <div className="bg-[#1B2D6B] text-white pt-10 pb-7 px-5 rounded-b-3xl shadow-lg relative overflow-hidden">
        {/* Soft Background Accents */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 -left-10 w-28 h-28 bg-[#E8151B]/15 rounded-full pointer-events-none" />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white p-1 grid place-items-center shadow-md shrink-0">
              <img src="/mss-logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-white/70 text-xs font-semibold">{greeting}</div>
              <div className="text-white text-lg font-black leading-tight truncate max-w-[210px]">
                {shopName}
              </div>
            </div>
          </div>
          <Link
            to="/settings"
            className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 grid place-items-center text-white active:scale-95 transition"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* Today's Sales Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-between relative z-10 shadow-inner">
          <div>
            <div className="text-white/70 text-[11px] font-bold uppercase tracking-wider">
              Today's Revenue
            </div>
            <div className="text-white text-3xl font-black mt-0.5 tracking-tight">
              ₹{todaySales.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-white/60 text-xs mt-1 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {todayInvoices.length} {todayInvoices.length === 1 ? "bill" : "bills"} created today
            </div>
          </div>
          <Link
            to="/invoices"
            className="h-12 w-12 rounded-2xl bg-[#E8151B] grid place-items-center text-white shadow-md active:scale-95 transition"
          >
            <Receipt className="h-6 w-6" />
          </Link>
        </div>
      </div>

      <div className="px-4 -mt-3 relative z-10 space-y-4">
        {/* ── Key Metrics Pills: Today's Metrics ── */}
        <div className="grid grid-cols-3 gap-2 bg-white rounded-2xl p-3 shadow-sm border border-slate-200">
          <Link to="/inventory" className="text-center p-2 rounded-xl hover:bg-slate-50 transition active:scale-95">
            <div className="text-lg font-black text-[#1B2D6B]">{todaySoldProductsQty} <span className="text-xs font-normal text-slate-400">pcs</span></div>
            <div className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">Today's Sold</div>
          </Link>
          <Link to="/customers" className="text-center p-2 rounded-xl hover:bg-slate-50 transition border-x border-slate-100 active:scale-95">
            <div className="text-lg font-black text-purple-700">{todayCustomersCount}</div>
            <div className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">Today's Customer</div>
          </Link>
          <Link to="/invoices" className="text-center p-2 rounded-xl hover:bg-slate-50 transition active:scale-95">
            <div className="text-lg font-black text-emerald-700">{todayInvoices.length}</div>
            <div className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">Today's Bills</div>
          </Link>
        </div>

        {/* ── Critical Alerts: Low Stock & Khata Due ── */}
        {(lowStockCount > 0 || totalDue > 0) && (
          <div className="space-y-2">
            {lowStockCount > 0 && (
              <Link
                to="/low-stock"
                className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 shadow-xs active:scale-98 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-white grid place-items-center shrink-0 shadow-xs">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-amber-950 text-sm font-black leading-tight">
                    {lowStockCount} Items Low in Stock
                  </div>
                  <div className="text-amber-700 text-xs font-medium mt-0.5">
                    Stock below minimum threshold (alert active)
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-500 shrink-0" />
              </Link>
            )}

            {totalDue > 0 && (
              <Link
                to="/ledger"
                className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 shadow-xs active:scale-98 transition"
              >
                <div className="h-10 w-10 rounded-xl bg-[#E8151B] text-white grid place-items-center shrink-0 shadow-xs">
                  <Landmark className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-rose-950 text-sm font-black leading-tight">
                    ₹{totalDue.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Total Khata Due
                  </div>
                  <div className="text-rose-700 text-xs font-medium mt-0.5">
                    Unpaid balances across customers
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[#E8151B] shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* ── Main Navigation Action Cards ── */}
        <div>
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2.5 px-1">
            Store Management
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Invoices & Bills",
                desc: "History & WhatsApp Share",
                to: "/invoices",
                icon: Receipt,
                bg: "bg-blue-50 hover:bg-blue-100/70 border-blue-200 text-blue-700",
                iconBg: "bg-blue-600 text-white",
              },
              {
                label: "Customer",
                desc: "Balances & Statements",
                to: "/customers",
                icon: Users,
                bg: "bg-purple-50 hover:bg-purple-100/70 border-purple-200 text-purple-700",
                iconBg: "bg-purple-600 text-white",
              },
              {
                label: "Stock Inventory",
                desc: "Catalog & Quantities",
                to: "/inventory",
                icon: Package,
                bg: "bg-teal-50 hover:bg-teal-100/70 border-teal-200 text-teal-700",
                iconBg: "bg-teal-600 text-white",
              },
              {
                label: "Ledger",
                desc: "Credit & Due Settlement",
                to: "/ledger",
                icon: Landmark,
                bg: "bg-amber-50 hover:bg-amber-100/70 border-amber-200 text-amber-700",
                iconBg: "bg-amber-600 text-white",
              },
              {
                label: "Low Stock Alert",
                desc: "Below Minimum Qty",
                to: "/low-stock",
                icon: TrendingDown,
                bg: "bg-rose-50 hover:bg-rose-100/70 border-rose-200 text-[#E8151B]",
                iconBg: "bg-[#E8151B] text-white",
              },
              {
                label: "Reports",
                desc: "Daily & Period Sales",
                to: "/reports",
                icon: BarChart2,
                bg: "bg-indigo-50 hover:bg-indigo-100/70 border-indigo-200 text-indigo-700",
                iconBg: "bg-indigo-600 text-white",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as any}
                  className={`rounded-2xl border p-4 flex flex-col justify-between shadow-xs active:scale-95 transition-all min-h-[110px] ${item.bg}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl grid place-items-center shadow-xs ${item.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </div>
                  <div>
                    <div className="font-black text-sm leading-tight text-slate-900 mt-2">
                      {item.label}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">
                      {item.desc}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Recent Invoices Section ── */}
        {recentInvoices.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Recent Invoices
              </div>
              <Link to="/invoices" className="text-xs font-bold text-[#1B2D6B] hover:underline">
                View All
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  to="/invoices"
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 transition rounded-lg px-1"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {inv.customer_name || "Walk-in Customer"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      #{inv.invoice_number} · {new Date(inv.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-slate-900">
                      ₹{Number(inv.grand_total).toLocaleString("en-IN")}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        inv.payment_status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : inv.payment_status === "PARTIAL"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {inv.payment_status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Dedicated Mobile Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 py-2 z-30 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {[
            { label: "Home", icon: Home, to: "/", active: true },
            { label: "Invoices", icon: Receipt, to: "/invoices", active: false },
            { label: "Customer", icon: Users, to: "/customers", active: false },
            { label: "Stock", icon: Package, to: "/inventory", active: false },
            { label: "Ledger", icon: Landmark, to: "/ledger", active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl min-w-[56px] active:scale-90 transition-transform"
              >
                <div
                  className={`h-7 w-7 rounded-lg grid place-items-center transition-colors ${
                    item.active ? "bg-[#1B2D6B] text-white" : "text-slate-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-[10px] font-bold tracking-tight ${
                    item.active ? "text-[#1B2D6B]" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
