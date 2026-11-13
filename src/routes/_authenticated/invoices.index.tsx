import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, Invoice } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import {
  FileSpreadsheet,
  Printer,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Search,
  Check,
} from "lucide-react";
import { BillViewerModal } from "@/components/BillViewerModal";
import { EditInvoiceModal } from "@/components/EditInvoiceModal";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/invoices/")({
  component: InvoicesPage,
});

type DateFilter = "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "LAST_MONTH";
type StatusFilter = "ALL" | "PAID" | "UNPAID" | "PARTIAL";

function matchesDateFilter(isoDate: string, filter: DateFilter): boolean {
  if (filter === "ALL") return true;
  const d = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === "TODAY") {
    return d >= startOfToday;
  }
  if (filter === "YESTERDAY") {
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    return d >= startOfYesterday && d < startOfToday;
  }
  if (filter === "WEEK") {
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);
    return d >= startOfWeek;
  }
  if (filter === "MONTH") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return d >= startOfMonth;
  }
  if (filter === "LAST_MONTH") {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return d >= startOfLastMonth && d <= endOfLastMonth;
  }
  return true;
}

function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedBill, setSelectedBill] = useState<{ invoice: any; items: any[] } | null>(null);
  const [editingBill, setEditingBill] = useState<{ invoice: any; items: any[] } | null>(null);
  const [settlingInvoice, setSettlingInvoice] = useState<Invoice | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleMode, setSettleMode] = useState<"CASH" | "UPI" | "BANK" | "CHEQUE">("UPI");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, statusFilter, search]);

  const invoicesQuery = useQuery({
    queryKey: ["invoices", dateFilter, statusFilter, search],
    queryFn: async () => {
      let all: Invoice[] = db.getInvoices();

      if (dateFilter !== "ALL") {
        all = all.filter((i) => matchesDateFilter(i.created_at, dateFilter));
      }

      if (statusFilter !== "ALL") {
        all = all.filter((i) => {
          const isPaid = i.payment_status === "PAID" || (i.balance_due || 0) === 0;
          const isUnpaid = i.payment_status === "UNPAID" || i.amount_paid === 0;
          const isPartial = i.payment_status === "PARTIAL" || (!isPaid && !isUnpaid);

          if (statusFilter === "PAID") return isPaid;
          if (statusFilter === "UNPAID") return isUnpaid;
          if (statusFilter === "PARTIAL") return isPartial;
          return true;
        });
      }

      if (search.trim()) {
        const clean = search.toLowerCase();
        all = all.filter(
          (i) =>
            i.invoice_number.toLowerCase().includes(clean) ||
            i.customer_name?.toLowerCase().includes(clean) ||
            (i.customer_mobile && i.customer_mobile.includes(clean))
        );
      }
      return all;
    },
  });

  const allInvs = invoicesQuery.data || [];
  const totalInvoicesCount = allInvs.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalInvoicesCount / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const displayedInvoices =
    pageSize === -1
      ? allInvs
      : allInvs.slice((activePage - 1) * pageSize, activePage * pageSize);

  // Settlement mutation
  const settleMutation = useMutation({
    mutationFn: async () => {
      if (!settlingInvoice) return;
      const amountToPay = Number(settleAmount || settlingInvoice.balance_due);
      const isFull = amountToPay >= (settlingInvoice.balance_due || settlingInvoice.grand_total);
      const newStatus = isFull ? "PAID" : "PARTIAL";

      return db.updateInvoicePaymentStatus(
        settlingInvoice.id,
        newStatus,
        (settlingInvoice.amount_paid || 0) + amountToPay,
        settleMode
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      toast.success("Payment recorded! Invoice & Customer Balance updated.");
      setSettlingInvoice(null);
      setSettleAmount("");
    },
  });

  function exportInvoicesExcel() {
    const data = allInvs.map((i) => ({
      "Invoice Number": i.invoice_number,
      Date: i.created_at ? i.created_at.split("T")[0] : "",
      Customer: i.customer_name,
      Mobile: i.customer_mobile,
      Type: i.invoice_type,
      "Grand Total (₹)": i.grand_total,
      "Amount Paid (₹)": i.amount_paid,
      "Balance Due (₹)": i.balance_due,
      "Payment Status": i.payment_status,
      "Payment Method": i.payment_method,
    }));
    ExcelEngine.exportToExcel(
      data,
      `Kairos_Bills_Invoices_${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Invoices log exported to Excel");
  }

  return (
    <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        title="Sales Invoices & Billing History"
        subtitle={`${allInvs.length} total invoices on record`}
        action={
          <button
            onClick={exportInvoicesExcel}
            className="h-9 px-3.5 rounded-xl bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-sky-400 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="p-3.5 rounded-2xl border border-border bg-card flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="h-8.5 rounded-xl bg-input border border-border px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-8.5 rounded-xl bg-input border border-border px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid in Full</option>
              <option value="UNPAID">Unpaid / Due</option>
              <option value="PARTIAL">Partially Paid</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer..."
            className="w-full h-8.5 pl-8 pr-3 rounded-xl bg-input border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Invoices List — Table on Desktop, Cards on Mobile */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/60 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="text-left py-3 px-4">Invoice #</th>
                <th className="text-left py-3 px-4">Date & Time</th>
                <th className="text-left py-3 px-4">Customer</th>
                <th className="text-right py-3 px-4">Total Amount</th>
                <th className="text-right py-3 px-4">Paid</th>
                <th className="text-right py-3 px-4">Balance Due</th>
                <th className="text-center py-3 px-4">Payment Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayedInvoices.map((inv) => {
                const isPaid = inv.payment_status === "PAID" || (inv.balance_due || 0) === 0;
                const isUnpaid = inv.payment_status === "UNPAID" || inv.amount_paid === 0;
                const isPartial = inv.payment_status === "PARTIAL" || (!isPaid && !isUnpaid);

                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-primary text-sm">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{inv.customer_name}</div>
                      {inv.customer_mobile && (
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {inv.customer_mobile}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      ₹{(inv.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                      ₹{(inv.amount_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {inv.balance_due > 0 ? (
                        <span className="text-amber-400">
                          ₹{inv.balance_due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : isPartial
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {isPaid && <CheckCircle2 className="h-3 w-3" />}
                        {isPartial && <Clock className="h-3 w-3" />}
                        {isUnpaid && <AlertCircle className="h-3 w-3" />}
                        {isPaid ? "Paid in Full" : isPartial ? "Partial Due" : "Unpaid / Credit"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      {!isPaid && (
                        <button
                          onClick={() => {
                            setSettlingInvoice(inv);
                            setSettleAmount(String(inv.balance_due));
                          }}
                          className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Wallet className="h-3 w-3" /> Pay Due
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedBill({ invoice: inv, items: inv.items || [] })}
                        className="h-7 px-2.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-[11px] font-bold border border-primary/30 inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Printer className="h-3 w-3" /> View Bill
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayedInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                    No matching invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Phone Card View — Perfectly Formatted for Phones */}
        <div className="block md:hidden divide-y divide-border">
          {displayedInvoices.map((inv) => {
            const isPaid = inv.payment_status === "PAID" || (inv.balance_due || 0) === 0;
            const isUnpaid = inv.payment_status === "UNPAID" || inv.amount_paid === 0;
            const isPartial = inv.payment_status === "PARTIAL" || (!isPaid && !isUnpaid);

            return (
              <div key={inv.id} className="p-3.5 space-y-2.5 bg-card hover:bg-muted/20 transition">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-black text-sm text-[#1B2D6B]">
                    {inv.invoice_number}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : isPartial
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {isPaid ? "Paid" : isPartial ? "Partial Due" : "Unpaid"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#0F172A]">
                  <div className="font-bold truncate max-w-[180px]">{inv.customer_name || "Walk-in Customer"}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {inv.created_at ? format(new Date(inv.created_at), "dd MMM, hh:mm a") : "—"}
                  </div>
                </div>

                {/* Amount breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] rounded-xl p-2.5 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-muted-foreground">Total</div>
                    <div className="text-xs font-bold text-[#0F172A]">₹{Math.round(inv.grand_total || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-600 font-semibold">Paid</div>
                    <div className="text-xs font-bold text-emerald-600">₹{Math.round(inv.amount_paid || 0)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-600 font-semibold">Due</div>
                    <div className="text-xs font-bold text-amber-600">₹{Math.round(inv.balance_due || 0)}</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setSelectedBill({ invoice: inv, items: inv.items || [] })}
                    className="flex-1 h-8.5 rounded-xl bg-[#1B2D6B] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5" /> View Bill
                  </button>
                  {!isPaid && (
                    <button
                      onClick={() => {
                        setSettlingInvoice(inv);
                        setSettleAmount(String(inv.balance_due));
                      }}
                      className="h-8.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                    >
                      <Wallet className="h-3.5 w-3.5" /> Pay Due
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {displayedInvoices.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No matching invoices found.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalInvoicesCount > 0 && (
          <div className="p-3 border-t border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-muted-foreground font-mono text-[11px]">
              Showing {(activePage - 1) * pageSize + 1} to{" "}
              {Math.min(activePage * pageSize, totalInvoicesCount)} of {totalInvoicesCount} invoices
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={activePage === 1}
                className="h-7 px-3 rounded-lg border border-border bg-secondary hover:bg-muted text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                ‹ Prev
              </button>
              <span className="font-mono font-bold text-primary text-xs px-1">
                {activePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={activePage >= totalPages}
                className="h-7 px-3 rounded-lg border border-border bg-secondary hover:bg-muted text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settle Due Modal */}
      {settlingInvoice && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="font-bold text-base text-foreground flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <span>Collect Invoice Payment</span>
              </div>
              <button
                onClick={() => setSettlingInvoice(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/60 border border-border space-y-1">
              <div className="text-xs text-muted-foreground">Invoice #{settlingInvoice.invoice_number}</div>
              <div className="font-bold text-sm text-foreground">{settlingInvoice.customer_name}</div>
              <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                <span className="text-xs text-muted-foreground">Balance Due on this bill:</span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  ₹{(settlingInvoice.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-xl bg-input border border-border text-foreground font-mono font-bold text-base focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["UPI", "CASH", "BANK", "CHEQUE"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSettleMode(m)}
                      className={`h-9 rounded-xl text-xs font-bold transition cursor-pointer ${
                        settleMode === m
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setSettlingInvoice(null)}
                className="h-9 px-4 rounded-xl border border-border bg-secondary hover:bg-muted text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={settleMutation.isPending || !settleAmount || Number(settleAmount) <= 0}
                onClick={() => settleMutation.mutate()}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Mark as Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Viewer Modal */}
      {selectedBill && (
        <BillViewerModal
          invoice={selectedBill.invoice}
          items={selectedBill.items}
          onClose={() => setSelectedBill(null)}
        />
      )}

      {/* Edit Invoice Modal */}
      {editingBill && (
        <EditInvoiceModal
          invoice={editingBill.invoice}
          items={editingBill.items}
          onClose={() => setEditingBill(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["invoices"] });
            qc.invalidateQueries({ queryKey: ["inventory"] });
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["ledger"] });
            setEditingBill(null);
          }}
        />
      )}
    </div>
  );
}
