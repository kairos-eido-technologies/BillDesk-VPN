import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, Customer, Invoice } from "@/lib/db/db";
import { ExcelEngine } from "@/lib/excel/excel-engine";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "./dashboard";
import { inr } from "@/lib/format";
import {
  Plus,
  X,
  User,
  FileSpreadsheet,
  Download,
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
} from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"invoices" | "ledger">("invoices");

  // Payment form state
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<"CASH" | "UPI" | "BANK" | "CHEQUE">("UPI");
  const [payNotes, setPayNotes] = useState("");

  const customers = useQuery({
    queryKey: ["customers", q],
    queryFn: async () => {
      const all = db.getCustomers();
      if (!q.trim()) return all;
      const clean = q.toLowerCase();
      return all.filter(
        (c) => c.name.toLowerCase().includes(clean) || c.mobile.includes(clean)
      );
    },
  });

  const allCust = customers.data || [];

  // Automatically keep selected customer updated if balance changes
  useEffect(() => {
    if (selected) {
      const fresh = allCust.find((c) => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [allCust]);

  // Customer Invoices
  const customerInvoices = selected ? db.getCustomerInvoices(selected.id) : [];
  // Customer Ledger
  const customerLedger = selected ? db.getCustomerLedger(selected.id) : [];

  // Payment Mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !payAmount || Number(payAmount) <= 0) return;
      return db.recordLedgerPayment({
        customer_id: selected.id,
        customer_name: selected.name,
        customer_mobile: selected.mobile,
        amount: Number(payAmount),
        payment_mode: payMode,
        notes: payNotes || "Customer payment received",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      toast.success("Payment recorded and customer balance updated!");
      setShowPaymentModal(false);
      setPayAmount("");
      setPayNotes("");
    },
  });

  // Mark invoice paid mutation
  const markInvoicePaidMutation = useMutation({
    mutationFn: async ({ invoiceId, amount }: { invoiceId: string; amount: number }) => {
      return db.updateInvoicePaymentStatus(invoiceId, "PAID", amount, "CASH");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      toast.success("Invoice marked as Paid! Customer balance updated.");
    },
  });

  function exportCustomersExcel() {
    const data = (customers.data || []).map((c) => ({
      "Customer Name": c.name,
      Mobile: c.mobile,
      Email: c.email,
      Address: c.address,
      GSTIN: c.gst_number,
      "Balance Due (₹)": c.balance_due,
      "Total Spent (₹)": c.total_spent,
    }));
    ExcelEngine.exportToExcel(
      data,
      `Kairos_Customers_${new Date().toISOString().split("T")[0]}`
    );
    toast.success("Customer list exported to Excel");
  }

  function handleOpenPayment() {
    if (!selected) return;
    setPayAmount(selected.balance_due > 0 ? String(selected.balance_due) : "");
    setShowPaymentModal(true);
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      <PageHeader
        title="Customers & Client Accounts"
        subtitle={`${customers.data?.length ?? 0} registered customer profiles`}
        action={
          <div className="flex gap-2">
            <button
              onClick={exportCustomersExcel}
              className="h-9 px-3 rounded-xl bg-secondary border border-border text-xs font-semibold flex items-center gap-1.5 hover:bg-muted transition text-sky-400 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
        {/* Left: Customer List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="p-3 border-b border-border bg-card/60">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by customer name or phone..."
              className="w-full h-9 px-3 rounded-xl bg-input border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="max-h-[580px] overflow-auto divide-y divide-border">
            {allCust.map((c) => {
              const hasDue = (c.balance_due || 0) > 0;
              const isSelected = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition cursor-pointer ${
                    isSelected ? "bg-primary/10 border-l-4 border-l-primary" : ""
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 grid place-items-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {c.name || "Walk-in Customer"}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">{c.mobile || "No phone"}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {hasDue ? (
                      <div className="text-xs font-mono font-bold text-amber-400">
                        Due: ₹{c.balance_due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      Spent: ₹{(c.total_spent || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </button>
              );
            })}
            {allCust.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No customer records found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Customer Profile & History */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          {selected ? (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-border">
                <div>
                  <div className="text-lg font-black text-foreground">{selected.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    Phone: {selected.mobile || "N/A"}
                  </div>
                  {selected.gst_number && (
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      GSTIN: {selected.gst_number}
                    </div>
                  )}
                  {selected.address && (
                    <div className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {selected.address}
                    </div>
                  )}
                </div>

                {/* Due Balance Card & Settle Button */}
                <div className="p-3.5 rounded-xl bg-secondary/60 border border-border sm:text-right flex flex-col sm:items-end gap-1.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Outstanding Balance (To Pay)
                  </div>
                  <div
                    className={`text-xl font-mono font-black ${
                      (selected.balance_due || 0) > 0 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    ₹{(selected.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={handleOpenPayment}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      <span>Collect Payment</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs: Invoices vs Ledger */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "invoices"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Invoice History ({customerInvoices.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab("ledger")}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "ledger"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Landmark className="h-3.5 w-3.5" />
                  <span>Account Ledger ({customerLedger.length})</span>
                </button>
              </div>

              {/* TAB 1: Invoices History */}
              {activeTab === "invoices" && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground font-medium">
                    Detailed record of all invoices generated for {selected.name}:
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-auto pr-1">
                    {customerInvoices.map((inv) => {
                      const isPaid = inv.payment_status === "PAID" || (inv.balance_due || 0) === 0;
                      const isUnpaid = inv.payment_status === "UNPAID" || inv.amount_paid === 0;
                      const isPartial = inv.payment_status === "PARTIAL" || (!isPaid && !isUnpaid);

                      return (
                        <div
                          key={inv.id}
                          className="p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-primary text-xs">
                                {inv.invoice_number}
                              </span>
                              <span
                                className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                  isPaid
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : isPartial
                                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {isPaid ? "Paid in Full" : isPartial ? "Partially Paid" : "Unpaid / Credit"}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4">
                            <div className="text-right">
                              <div className="font-mono font-bold text-foreground text-xs">
                                Total: ₹{(inv.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] font-mono text-muted-foreground">
                                Paid: ₹{(inv.amount_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                {!isPaid && (
                                  <span className="text-amber-400 font-bold ml-1.5">
                                    Due: ₹{(inv.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {!isPaid && (
                              <button
                                onClick={() =>
                                  markInvoicePaidMutation.mutate({
                                    invoiceId: inv.id,
                                    amount: inv.grand_total,
                                  })
                                }
                                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs shrink-0"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Mark Paid</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {customerInvoices.length === 0 && (
                      <div className="text-xs text-muted-foreground py-10 text-center">
                        No purchase invoices recorded for this customer yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Ledger History */}
              {activeTab === "ledger" && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground font-medium">
                    Audit trail of debits (bills) and credits (payments):
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
                    {customerLedger.map((row) => {
                      const isDebit = row.type === "DEBIT";
                      return (
                        <div
                          key={row.id}
                          className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-7 w-7 rounded-lg grid place-items-center ${
                                isDebit
                                  ? "bg-rose-500/15 text-rose-400"
                                  : "bg-emerald-500/15 text-emerald-400"
                              }`}
                            >
                              {isDebit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {isDebit ? "Bill Debit (Invoice)" : "Payment Credit Received"}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                Ref: {row.reference_id} • {row.date ? format(new Date(row.date), "dd MMM yyyy") : "—"}
                                {row.payment_mode && ` (${row.payment_mode})`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`font-mono font-bold ${
                                isDebit ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {isDebit ? "+" : "-"} ₹{Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Bal: ₹{Number(row.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {customerLedger.length === 0 && (
                      <div className="text-xs text-muted-foreground py-10 text-center">
                        No transactions recorded in ledger for this customer.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[320px] grid place-items-center text-sm text-muted-foreground">
              Select a customer from the left list to view their purchase history, payment status, and khata ledger.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Record Customer Payment */}
      {showPaymentModal && selected && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 my-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div className="font-bold text-base text-foreground flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <span>Collect Payment from {selected.name}</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-secondary/60 border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Current Balance To Pay</div>
              <div className="text-lg font-mono font-black text-amber-400">
                ₹{(selected.balance_due || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full h-10 px-3 rounded-xl bg-input border border-border text-foreground font-mono font-bold text-base focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["UPI", "CASH", "BANK", "CHEQUE"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMode(m)}
                      className={`h-9 rounded-xl text-xs font-bold transition cursor-pointer ${
                        payMode === m
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}
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
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Optional reference note..."
                  className="w-full h-9 px-3 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

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
                disabled={payMutation.isPending || !payAmount || Number(payAmount) <= 0}
                onClick={() => payMutation.mutate()}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Customer */}
      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["customers"] });
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const saved = db.saveCustomer({
      name,
      mobile,
      email,
      address,
      gst_number: gstNumber,
      balance_due: Number(openingBalance || 0),
    });

    if (Number(openingBalance || 0) > 0) {
      db.recordLedgerPayment({
        customer_id: saved.id,
        customer_name: saved.name,
        customer_mobile: saved.mobile,
        amount: Number(openingBalance),
        payment_mode: "CASH",
        notes: "Opening balance due",
      });
    }

    toast.success("Customer profile saved!");
    onSaved();
  }

  const ic =
    "w-full h-9 rounded-xl bg-input border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4 my-auto"
      >
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <div className="text-base font-bold text-foreground">Add New Customer</div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Customer Name *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={ic}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Mobile Number
            </label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className={`${ic} font-mono`}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Opening Balance Due (₹)
            </label>
            <input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className={`${ic} font-mono`}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={ic}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              GSTIN (B2B)
            </label>
            <input
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
              className={`${ic} font-mono`}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={ic}
            />
          </div>
          <button
            type="submit"
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition shadow-xs cursor-pointer mt-2"
          >
            Save Customer Profile
          </button>
        </form>
      </div>
    </div>
  );
}