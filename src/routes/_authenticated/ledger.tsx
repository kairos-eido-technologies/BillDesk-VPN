import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, Customer, LedgerEntry, Invoice } from "@/lib/db/db";
import {
  Landmark,
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Calendar,
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  CreditCard,
  Banknote,
  QrCode,
} from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/ledger")({
  component: LedgerPage,
});

function LedgerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"balances" | "transactions">("balances");
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "BANK" | "CHEQUE">("UPI");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => db.getCustomers(),
  });

  const ledgerQuery = useQuery({
    queryKey: ["ledger"],
    queryFn: async () => db.getLedger(),
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => db.getInvoices(),
  });

  const customers = customersQuery.data || [];
  const ledger = ledgerQuery.data || [];
  const invoices = invoicesQuery.data || [];

  // Summary Metrics
  const totalReceivables = customers.reduce((sum, c) => sum + (c.balance_due || 0), 0);
  const customersWithDue = customers.filter((c) => (c.balance_due || 0) > 0);
  const totalPaymentsCollected = ledger
    .filter((l) => l.type === "CREDIT")
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCreditGiven = ledger
    .filter((l) => l.type === "DEBIT")
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  // Filtered customer list
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search)
  );

  // Filtered ledger list
  const filteredLedger = ledger.filter(
    (l) =>
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.customer_mobile && l.customer_mobile.includes(search)) ||
      (l.reference_id && l.reference_id.toLowerCase().includes(search.toLowerCase()))
  );

  // Payment record mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentCustomer || !paymentAmount || Number(paymentAmount) <= 0) return;
      return db.recordLedgerPayment({
        customer_id: paymentCustomer.id,
        customer_name: paymentCustomer.name,
        customer_mobile: paymentCustomer.mobile,
        amount: Number(paymentAmount),
        payment_mode: paymentMode,
        notes: paymentNotes || "Payment received against khata balance",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentCustomer(null);
    },
  });

  function openPaymentForCustomer(c: Customer) {
    setPaymentCustomer(c);
    setPaymentAmount(c.balance_due > 0 ? String(c.balance_due) : "");
    setShowPaymentModal(true);
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerLedger = selectedCustomerId
    ? db.getCustomerLedger(selectedCustomerId)
    : [];
  const selectedCustomerInvoices = selectedCustomerId
    ? db.getCustomerInvoices(selectedCustomerId)
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Customer Khata & Ledger
              </h1>
              <p className="text-xs text-muted-foreground">
                Track credit sales, payments received, and running account balances
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (customers.length > 0) {
                openPaymentForCustomer(customers[0]);
              }
            }}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Total Receivables (Due)</span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
            ₹{totalReceivables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Across {customersWithDue.length} customers with pending dues
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Payments Received</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            ₹{totalPaymentsCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Total settlements & receipts logged
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Total Credit Billed</span>
            <ArrowUpRight className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-mono">
            ₹{totalCreditGiven.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Invoiced to customer accounts
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Khata Accounts</span>
            <UserCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
            {customers.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Registered customer accounts
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("balances")}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "balances"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Customer Balances ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "transactions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Transaction Feed ({ledger.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, invoice..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* TAB 1: Customer Balances */}
      {activeTab === "balances" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Total Spent</th>
                  <th className="py-3 px-4 text-right">Balance Due (To Pay)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.map((c) => {
                  const hasDue = (c.balance_due || 0) > 0;
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground text-sm">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          ID: {c.id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {c.mobile || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        ₹{(c.total_spent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={hasDue ? "text-amber-400 text-sm" : "text-muted-foreground"}>
                          ₹{(c.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {hasDue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Due Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Clear
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="h-7 px-2.5 rounded-lg border border-border bg-secondary hover:bg-muted text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-primary" />
                            <span>Statement</span>
                          </button>
                          {hasDue && (
                            <button
                              onClick={() => openPaymentForCustomer(c)}
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Wallet className="h-3 w-3" />
                              <span>Settle</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No customer accounts found matching "{search}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: All Transaction Feed */}
      {activeTab === "transactions" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Mode / Details</th>
                  <th className="py-3 px-4 text-center">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLedger.map((l) => {
                  const isCredit = l.type === "CREDIT";
                  return (
                    <tr key={l.id} className="hover:bg-muted/30 transition">
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {l.date ? format(new Date(l.date), "dd MMM yyyy, hh:mm a") : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">{l.customer_name}</div>
                        {l.customer_mobile && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {l.customer_mobile}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                        {l.reference_id || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{l.payment_mode || "—"}</span>
                          {l.notes && <span className="text-[11px] text-muted-foreground">({l.notes})</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <ArrowDownLeft className="h-3 w-3" /> Payment Received
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <ArrowUpRight className="h-3 w-3" /> Bill Debit
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isCredit ? "text-emerald-400" : "text-rose-400"}>
                          {isCredit ? "-" : "+"} ₹
                          {Number(l.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        ₹{Number(l.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No ledger transactions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Settle / Record Payment */}
      {showPaymentModal && paymentCustomer && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-base text-foreground">Record Payment / Khata Settlement</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Customer Info Card */}
            <div className="p-3.5 rounded-xl bg-secondary/60 border border-border space-y-1">
              <div className="text-xs text-muted-foreground">Paying Customer</div>
              <div className="font-bold text-sm text-foreground">{paymentCustomer.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{paymentCustomer.mobile}</div>
              <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                <span className="text-xs text-muted-foreground font-medium">Outstanding Balance:</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  ₹{(paymentCustomer.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Amount Received (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full h-11 pl-8 pr-3 rounded-xl bg-input border border-border text-foreground font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["UPI", "CASH", "BANK", "CHEQUE"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        paymentMode === mode
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "UPI" && <QrCode className="h-3.5 w-3.5" />}
                      {mode === "CASH" && <Banknote className="h-3.5 w-3.5" />}
                      {mode === "BANK" && <CreditCard className="h-3.5 w-3.5" />}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. GPay UPI Ref: 489218..."
                  className="w-full h-9 px-3 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="h-9 px-4 rounded-xl border border-border bg-secondary hover:bg-muted text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={recordPaymentMutation.isPending || !paymentAmount || Number(paymentAmount) <= 0}
                onClick={() => recordPaymentMutation.mutate()}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Customer Account Statement */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-3 sm:p-6">
          <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl p-6 space-y-6 max-h-[88vh] my-auto overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center text-primary">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-foreground">
                    Account Statement — {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Phone: {selectedCustomer.mobile || "N/A"} | Registered:{" "}
                    {selectedCustomer.created_at ? format(new Date(selectedCustomer.created_at), "dd MMM yyyy") : "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-8 px-3 rounded-lg border border-border bg-secondary hover:bg-muted text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="h-8 w-8 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-mono grid place-items-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-center">
                <div className="text-[11px] text-muted-foreground font-semibold">Total Invoiced</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  ₹{(selectedCustomer.total_spent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-center">
                <div className="text-[11px] text-muted-foreground font-semibold">Current Balance Due</div>
                <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                  ₹{(selectedCustomer.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-center flex flex-col justify-center items-center">
                <button
                  onClick={() => {
                    openPaymentForCustomer(selectedCustomer);
                  }}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Collect Payment</span>
                </button>
              </div>
            </div>

            {/* Customer Invoices Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Invoices History ({selectedCustomerInvoices.length})
              </h4>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedCustomerInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-mono font-bold text-primary">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground font-mono">
                          {inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy") : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          ₹{inv.grand_total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400">
                          ₹{inv.amount_paid?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-400 font-bold">
                          ₹{inv.balance_due?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.payment_status === "PAID"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : inv.payment_status === "PARTIAL"
                                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {inv.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {selectedCustomerInvoices.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                          No invoices generated for this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Ledger Statement */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Ledger Entries & Running Balance ({selectedCustomerLedger.length})
              </h4>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference / Notes</th>
                      <th className="py-2.5 px-3 text-right">Debit (+)</th>
                      <th className="py-2.5 px-3 text-right">Credit (-)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedCustomerLedger.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-mono text-muted-foreground">
                          {row.date ? format(new Date(row.date), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {row.type === "DEBIT" ? (
                            <span className="text-rose-400">Debit (Invoice)</span>
                          ) : (
                            <span className="text-emerald-400">Credit (Payment)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          <span className="font-mono text-foreground">{row.reference_id}</span>
                          {row.notes && <span className="ml-1 text-[11px]">({row.notes})</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-400 font-semibold">
                          {row.type === "DEBIT"
                            ? `₹${Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold">
                          {row.type === "CREDIT"
                            ? `₹${Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          ₹{Number(row.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {selectedCustomerLedger.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                          No ledger transactions logged for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
