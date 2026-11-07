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

function Dashboard() {
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

      // Items sold today (sum of qty across all items in today's invoices)
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
        style={{ borderColor: "#243068" }}
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Daily Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#8B9CC5" }}>
            MSS Ponkumar Store · Today's Operations Summary
          </p>
        </div>
        <Link
          to="/pos"
          className="h-9 px-4 rounded-xl font-bold text-xs flex items-center gap-1 text-white hover:opacity-90 transition shadow"
          style={{ background: "#E8151B" }}
        >
          New Sale <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI Row 1 — Today's key numbers */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <KPI
          label="Today's Total Sales"
          value={inr(data?.todayTotalSales)}
          icon={IndianRupee}
          color="#E8151B"
          accent
        />
        <KPI
          label="Daily Income (Cash In)"
          value={inr(data?.todayDailyIncome)}
          icon={TrendingUp}
          color="#22c55e"
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
          color="#22c55e"
        />
        <KPI
          label="Credit Bills"
          value={`${data?.todayCreditBills ?? 0} bills`}
          sub={`${inr(data?.todayCreditOutstanding)} due`}
          icon={Clock}
          color="#f59e0b"
        />
      </div>

      {/* Row 2 — Billing Type breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-4 border-l-4"
          style={{
            background: "#162044",
            border: "1px solid #243068",
            borderLeftColor: "#1B2D6B",
            borderLeftWidth: "4px",
          }}
        >
          <div className="text-xs mb-1" style={{ color: "#8B9CC5" }}>
            Retail Bills Today
          </div>
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: "#fff" }}
          >
            {data?.todayRetailBills ?? 0}
          </div>
          <div className="text-[10px] mt-1" style={{ color: "#8B9CC5" }}>
            Retail invoices
          </div>
        </div>
        <div
          className="rounded-xl p-4 border-l-4"
          style={{
            background: "#162044",
            border: "1px solid #243068",
            borderLeftColor: "#E8151B",
            borderLeftWidth: "4px",
          }}
        >
          <div className="text-xs mb-1" style={{ color: "#8B9CC5" }}>
            Wholesale Bills Today
          </div>
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: "#E8151B" }}
          >
            {data?.todayWholesaleBills ?? 0}
          </div>
          <div className="text-[10px] mt-1" style={{ color: "#8B9CC5" }}>
            Wholesale invoices
          </div>
        </div>
        <div
          className="rounded-xl p-4 border-l-4"
          style={{
            background: "#162044",
            border: "1px solid #243068",
            borderLeftColor: "#22c55e",
            borderLeftWidth: "4px",
          }}
        >
          <div className="text-xs mb-1" style={{ color: "#8B9CC5" }}>
            Catalog Size
          </div>
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: "#22c55e" }}
          >
            {data?.productCount ?? 0}
          </div>
          <div className="text-[10px] mt-1" style={{ color: "#8B9CC5" }}>
            Products in inventory
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#162044", border: "1px solid #243068" }}
      >
        <div className="text-sm font-medium mb-3 flex items-center justify-between">
          <span className="text-white">Last 7 Days Revenue</span>
          <span className="text-[10px] font-mono" style={{ color: "#8B9CC5" }}>
            Offline SQLite · Live
          </span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chart ?? []}>
              <CartesianGrid stroke="#243068" vertical={false} />
              <XAxis dataKey="d" stroke="#8B9CC5" fontSize={11} />
              <YAxis stroke="#8B9CC5" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1A2755",
                  border: "1px solid #243068",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fff",
                }}
                formatter={(val: any) => [`₹${val}`, "Revenue"]}
              />
              <Bar
                dataKey="v"
                fill="#1B2D6B"
                radius={[4, 4, 0, 0]}
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
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4"
      style={{ borderColor: "#243068" }}
    >
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: "#8B9CC5" }}>
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
      className="rounded-xl p-4"
      style={{
        background: "#162044",
        border: `1px solid ${accent ? color || "#E8151B" : "#243068"}`,
        boxShadow: accent
          ? `0 0 0 1px ${color}33, 0 0 20px -4px ${color}44`
          : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium" style={{ color: "#8B9CC5" }}>
          {label}
        </div>
        <Icon
          className="h-4 w-4"
          style={{ color: color || "#8B9CC5" }}
        />
      </div>
      <div
        className="mt-2 text-2xl font-mono font-bold"
        style={{ color: color || "#fff" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-0.5 font-mono" style={{ color: "#8B9CC5" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
