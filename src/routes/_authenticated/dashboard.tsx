import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { inr } from "@/lib/format";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  ShoppingBag,
  ArrowUpRight,
  IndianRupee,
  Layers,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

export function Dashboard() {
  const stats = useQuery({
    queryKey: ["mss-dashboard-stats"],
    staleTime: 30_000,
    queryFn: async () => {
      const store = db.getStore();
      const allInvoices = store.invoices;

      // TODAY filter
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayInvoices = allInvoices.filter(
        (inv) => inv.created_at.slice(0, 10) === todayStr
      );

      // TODAY stats
      const todayTotalSales = todayInvoices.reduce(
        (s, inv) => s + Number(inv.grand_total || 0),
        0
      );
      const todayDailyIncome = todayInvoices.reduce(
        (s, inv) => s + Number(inv.amount_paid || 0),
        0
      );

      // Items sold today
      const todayItemsSold = todayInvoices.reduce((s, inv) => {
        const items = inv.items || [];
        return s + items.reduce((si, it) => si + Number(it.qty || 0), 0);
      }, 0);

      // Paid vs Credit
      const todayPaidBills = todayInvoices.filter(
        (inv) => inv.payment_status === "PAID"
      );
      const todayCreditBills = todayInvoices.filter(
        (inv) =>
          inv.payment_status === "UNPAID" || inv.payment_status === "PARTIAL"
      );
      const todayPaidAmount = todayPaidBills.reduce(
        (s, inv) => s + Number(inv.grand_total || 0),
        0
      );
      const todayCreditOutstanding = todayCreditBills.reduce(
        (s, inv) => s + Number(inv.balance_due || 0),
        0
      );

      // Last 7 days chart
      const byDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        byDay[d.toISOString().slice(0, 10)] = 0;
      }
      allInvoices.forEach((inv) => {
        const k = inv.created_at.slice(0, 10);
        if (k in byDay) byDay[k] += Number(inv.grand_total || 0);
      });
      const chart = Object.entries(byDay).map(([d, v]) => ({
        d: d.slice(5),
        v: Math.round(v),
      }));

      // Wholesale vs Retail today
      const todayWholesaleBills = todayInvoices.filter(
        (inv) => (inv as any).bill_mode === "WHOLESALE"
      ).length;
      const todayRetailBills = todayInvoices.filter(
        (inv) => (inv as any).bill_mode !== "WHOLESALE"
      ).length;

      return {
        todayTotalSales,
        todayDailyIncome,
        todayItemsSold,
        todayPaidBills: todayPaidBills.length,
        todayPaidAmount,
        todayCreditBills: todayCreditBills.length,
        todayCreditOutstanding,
        chart,
        todayWholesaleBills,
        todayRetailBills,
        totalBillsToday: todayInvoices.length,
        productCount: store.inventory.length,
      };
    },
  });

  const data = stats.data;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3 sm:pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1B2D6B]">
            Daily Operations Dashboard
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            MSS Ponkumar Store · Live Store Performance &amp; Daily Cash Flow
          </p>
        </div>
        {/* Hide POS on mobile */}
        <Link
          to="/pos"
          className="hidden md:flex h-10 px-4 rounded-xl font-bold text-xs items-center gap-1.5 text-white bg-[#E8151B] hover:bg-[#c90f14] transition shadow-sm active:scale-95 w-fit"
        >
          Open POS Billing <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI Row 1 — Today's key numbers formatted for mobile screens */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4">
        <KPI
          label="Today's Total Sales"
          value={inr(data?.todayTotalSales)}
          icon={IndianRupee}
          color="#1B2D6B"
          accent
        />
        <KPI
          label="Daily Income (Cash In)"
          value={inr(data?.todayDailyIncome)}
          icon={TrendingUp}
          color="#16a34a"
        />
        <KPI
          label="Items Sold Today"
          value={String(data?.todayItemsSold ?? 0)}
          icon={ShoppingBag}
          color="#1B2D6B"
        />
        <KPI
          label="Fully Paid Bills"
          value={`${data?.todayPaidBills ?? 0} bills`}
          sub={inr(data?.todayPaidAmount)}
          icon={CheckCircle2}
          color="#16a34a"
        />
        <KPI
          label="Credit Bills"
          value={`${data?.todayCreditBills ?? 0} bills`}
          sub={`${inr(data?.todayCreditOutstanding)} due`}
          icon={Clock}
          color="#d97706"
        />
      </div>

      {/* Row 2 — Billing Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 bg-white border border-[#E2E8F0] border-l-4 border-l-[#1B2D6B] shadow-xs">
          <div className="text-xs font-semibold text-[#64748B] mb-1">
            Retail Invoices Today
          </div>
          <div className="text-3xl font-black font-mono text-[#1B2D6B]">
            {data?.todayRetailBills ?? 0}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Standard customer retail bills
          </div>
        </div>

        <div className="rounded-xl p-5 bg-white border border-[#E2E8F0] border-l-4 border-l-[#E8151B] shadow-xs">
          <div className="text-xs font-semibold text-[#64748B] mb-1">
            Wholesale Invoices Today
          </div>
          <div className="text-3xl font-black font-mono text-[#E8151B]">
            {data?.todayWholesaleBills ?? 0}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Wholesale discounted bills
          </div>
        </div>

        <div className="rounded-xl p-5 bg-white border border-[#E2E8F0] border-l-4 border-l-[#16a34a] shadow-xs">
          <div className="text-xs font-semibold text-[#64748B] mb-1">
            Total Inventory Catalog
          </div>
          <div className="text-3xl font-black font-mono text-[#16a34a]">
            {data?.productCount ?? 0}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            Active products in store catalog
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl p-6 bg-white border border-[#E2E8F0] shadow-xs">
        <div className="text-sm font-bold text-[#1B2D6B] mb-4 flex items-center justify-between">
          <span>Last 7 Days Sales Trend (₹)</span>
          <span className="text-xs font-mono text-[#64748B] font-normal">
            Local SQLite · Ground Truth
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chart ?? []}>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="d" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#0F172A",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
                formatter={(val: any) => [`₹${val}`, "Revenue"]}
              />
              <Bar
                dataKey="v"
                fill="#1B2D6B"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
      <div>
        <h1 className="text-xl font-black tracking-tight text-[#1B2D6B]">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[#64748B] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function KPI({
  label,
  value,
  sub,
  icon: Icon,
  color,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 bg-white border transition shadow-xs ${
        accent ? "border-[#1B2D6B] ring-1 ring-[#1B2D6B]/10" : "border-[#E2E8F0]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[#64748B]">
          {label}
        </div>
        <Icon
          className="h-4 w-4"
          style={{ color: color || "#1B2D6B" }}
        />
      </div>
      <div
        className="mt-2 text-2xl font-mono font-black"
        style={{ color: color || "#1B2D6B" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5 font-mono text-[#64748B] font-semibold">
          {sub}
        </div>
      )}
    </div>
  );
}
