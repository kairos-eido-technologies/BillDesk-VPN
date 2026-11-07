import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, Customer, LedgerEntry, Invoice } from "@/lib/db/db";
import { BillViewerModal } from "@/components/BillViewerModal";
import { PaginationControls } from "@/components/PaginationControls";
import { toast } from "sonner";
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
  Eye,
  Receipt,
  Users,
  ShoppingBag,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/ledger")({
  component: LedgerPage,
});

export interface StoreBuyerRecord {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gst_number?: string;
  isRegistered: boolean;
  totalBills: number;
  totalSpent: number;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: "PAID" | "UNPAID" | "PARTIAL" | "NO_PURCHASES";
  billModes: string[];
  lastPurchaseDate?: string;
  invoices: Invoice[];
  customer?: Customer;
}

type FeedItem =
  | { kind: "INVOICE"; id: string; date: string; invoice: Invoice }
  | { kind: "PAYMENT"; id: string; date: string; ledger: LedgerEntry };

function LedgerPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"balances" | "transactions">("balances");
  const [buyerFilter, setBuyerFilter] = useState<"ALL" | "DUE" | "PAID" | "WHOLESALE" | "RETAIL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBuyer, setPaymentBuyer] = useState<StoreBuyerRecord | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Pagination states (20 per page)
  const PAGE_SIZE = 20;
  const [buyerPage, setBuyerPage] = useState(1);
  const [feedPage, setFeedPage] = useState(1);
  const [modalInvPage, setModalInvPage] = useState(1);
  const [modalLedgerPage, setModalLedgerPage] = useState(1);

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

  // Reset pagination when filter/search/selected buyer changes
  useEffect(() => {
    setBuyerPage(1);
  }, [buyerFilter, search]);

  useEffect(() => {
    setFeedPage(1);
  }, [search]);

  useEffect(() => {
    setModalInvPage(1);
    setModalLedgerPage(1);
  }, [selectedBuyerId]);

  // -------------------------------------------------------------
  // Aggregate ALL Store Buyers (Registered + Direct Walk-in / Invoices)
  // -------------------------------------------------------------
  const allStoreBuyers = useMemo(() => {
    const list: StoreBuyerRecord[] = [];
    const matchedInvoiceIds = new Set<string>();

    // 1. Process registered customer accounts
    customers.forEach((c) => {
      const custInvs = db.getCustomerInvoices(c.id, c.name, c.mobile);
      custInvs.forEach((inv) => matchedInvoiceIds.add(inv.id));

      const totalBills = custInvs.length;
      const totalSpent = custInvs.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);
      const totalPaid = custInvs.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0);
      const balanceDue = Number(c.balance_due || 0);

      let paymentStatus: "PAID" | "UNPAID" | "PARTIAL" | "NO_PURCHASES" = "NO_PURCHASES";
      if (balanceDue > 0) {
        paymentStatus = totalPaid > 0 ? "PARTIAL" : "UNPAID";
      } else if (totalSpent > 0 || totalBills > 0) {
        paymentStatus = "PAID";
      }

      const modes = Array.from(new Set(custInvs.map((inv) => inv.bill_mode || "RETAIL")));
      const lastDate = custInvs[0]?.created_at;

      list.push({
        id: c.id,
        name: c.name || "Customer",
        mobile: c.mobile || "",
        email: c.email,
        address: c.address,
        gst_number: c.gst_number,
        isRegistered: true,
        totalBills,
        totalSpent,
        totalPaid,
        balanceDue,
        paymentStatus,
        billModes: modes.length > 0 ? modes : ["RETAIL"],
        lastPurchaseDate: lastDate,
        invoices: custInvs,
        customer: c,
      });
    });

    // 2. Process invoices not associated with any registered customer (Walk-ins / Direct buyers)
    const unlinkedInvoices = invoices.filter((inv) => !matchedInvoiceIds.has(inv.id));
    const unlinkedGroups = new Map<string, Invoice[]>();

    unlinkedInvoices.forEach((inv) => {
      const key = inv.customer_mobile?.trim()
        ? `mobile:${inv.customer_mobile.trim()}`
        : inv.customer_name?.trim()
          ? `name:${inv.customer_name.trim().toLowerCase()}`
          : "walk-in";

      if (!unlinkedGroups.has(key)) {
        unlinkedGroups.set(key, []);
      }
      unlinkedGroups.get(key)!.push(inv);
    });

    unlinkedGroups.forEach((invs, key) => {
      const first = invs[0];
      const name = first.customer_name?.trim() || "Walk-in Retail Buyer";
      const mobile = first.customer_mobile?.trim() || "";
      const totalBills = invs.length;
      const totalSpent = invs.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);
      const totalPaid = invs.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0);
      const balanceDue = invs.reduce((acc, inv) => acc + (inv.balance_due || 0), 0);

      let paymentStatus: "PAID" | "UNPAID" | "PARTIAL" | "NO_PURCHASES" = "PAID";
      if (balanceDue > 0) {
        paymentStatus = totalPaid > 0 ? "PARTIAL" : "UNPAID";
      }

      const modes = Array.from(new Set(invs.map((inv) => inv.bill_mode || "RETAIL")));

      list.push({
        id: `direct-buyer-${key}`,
        name,
        mobile,
        isRegistered: false,
        totalBills,
        totalSpent,
        totalPaid,
        balanceDue,
        paymentStatus,
        billModes: modes,
        lastPurchaseDate: invs[0]?.created_at,
        invoices: invs,
      });
    });

    return list;
  }, [customers, invoices]);

  // Summary Metrics
  const totalReceivables = allStoreBuyers.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
  const buyersWithDue = allStoreBuyers.filter((b) => (b.balanceDue || 0) > 0);
  const buyersPaidInFull = allStoreBuyers.filter((b) => b.paymentStatus === "PAID" && b.totalBills > 0);
  const wholesaleBuyers = allStoreBuyers.filter((b) => b.billModes.includes("WHOLESALE"));
  const retailBuyers = allStoreBuyers.filter((b) => b.billModes.includes("RETAIL"));

  const totalPaymentsCollected = ledger
    .filter((l) => l.type === "CREDIT")
    .reduce((sum, l) => sum + (l.amount || 0), 0);

  // Filtered buyers list
  const filteredBuyers = useMemo(() => {
    return allStoreBuyers.filter((b) => {
      // Filter status
      if (buyerFilter === "DUE" && b.balanceDue <= 0) return false;
      if (buyerFilter === "PAID" && (b.balanceDue > 0 || b.paymentStatus !== "PAID")) return false;
      if (buyerFilter === "WHOLESALE" && !b.billModes.includes("WHOLESALE")) return false;
      if (buyerFilter === "RETAIL" && !b.billModes.includes("RETAIL")) return false;

      // Search query
      if (search.trim()) {
        const clean = search.toLowerCase();
        const matchName = b.name.toLowerCase().includes(clean);
        const matchMobile = b.mobile.includes(clean);
        const matchInvoices = b.invoices.some((inv) => inv.invoice_number.toLowerCase().includes(clean));
        if (!matchName && !matchMobile && !matchInvoices) return false;
      }

      return true;
    });
  }, [allStoreBuyers, buyerFilter, search]);

  // Paginated Buyers (20 per page)
  const totalBuyerPages = Math.max(1, Math.ceil(filteredBuyers.length / PAGE_SIZE));
  const paginatedBuyers = filteredBuyers.slice((buyerPage - 1) * PAGE_SIZE, buyerPage * PAGE_SIZE);

  // Filtered ledger list
  const filteredLedger = ledger.filter(
    (l) =>
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.customer_mobile && l.customer_mobile.includes(search)) ||
      (l.reference_id && l.reference_id.toLowerCase().includes(search.toLowerCase()))
  );

  // Unified Transaction Feed (Sales Invoices + Ledger Receipts)
  const allFeedItems = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];

    invoices.forEach((inv) => {
      if (search.trim()) {
        const clean = search.toLowerCase();
        const matchName = (inv.customer_name || "").toLowerCase().includes(clean);
        const matchMobile = (inv.customer_mobile || "").includes(clean);
        const matchNumber = (inv.invoice_number || "").toLowerCase().includes(clean);
        if (!matchName && !matchMobile && !matchNumber) return;
      }
      list.push({
        kind: "INVOICE",
        id: `inv-${inv.id}`,
        date: inv.created_at,
        invoice: inv,
      });
    });

    filteredLedger.forEach((l) => {
      list.push({
        kind: "PAYMENT",
        id: `led-${l.id}`,
        date: l.date,
        ledger: l,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, filteredLedger, search]);

  // Paginated Feed (20 per page)
  const totalFeedPages = Math.max(1, Math.ceil(allFeedItems.length / PAGE_SIZE));
  const paginatedFeed = allFeedItems.slice((feedPage - 1) * PAGE_SIZE, feedPage * PAGE_SIZE);

  // Selected buyer for statement modal
  const selectedBuyer = allStoreBuyers.find((b) => b.id === selectedBuyerId);
  const selectedBuyerLedger = selectedBuyer
    ? db.getCustomerLedger(selectedBuyer.isRegistered ? selectedBuyer.id : "", selectedBuyer.name, selectedBuyer.mobile)
    : [];

  // Paginated Statement Invoices (20 per page)
  const totalModalInvPages = selectedBuyer ? Math.max(1, Math.ceil(selectedBuyer.invoices.length / PAGE_SIZE)) : 1;
  const paginatedModalInvoices = selectedBuyer
    ? selectedBuyer.invoices.slice((modalInvPage - 1) * PAGE_SIZE, modalInvPage * PAGE_SIZE)
    : [];

  // Paginated Statement Ledger (20 per page)
  const totalModalLedgerPages = Math.max(1, Math.ceil(selectedBuyerLedger.length / PAGE_SIZE));
  const paginatedModalLedger = selectedBuyerLedger.slice(
    (modalLedgerPage - 1) * PAGE_SIZE,
    modalLedgerPage * PAGE_SIZE
  );

  // Payment record mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentBuyer || !paymentAmount || Number(paymentAmount) <= 0) return;
      return db.recordLedgerPayment({
        customer_id: paymentBuyer.id,
        customer_name: paymentBuyer.name,
        customer_mobile: paymentBuyer.mobile,
        amount: Number(paymentAmount),
        payment_mode: paymentMode,
        notes: paymentNotes || "Payment received against store ledger balance",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded and ledger balance updated!");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentBuyer(null);
    },
  });

  // Mark invoice paid mutation
  const markInvoicePaidMutation = useMutation({
    mutationFn: async ({ invoiceId, amount }: { invoiceId: string; amount: number }) => {
      return db.updateInvoicePaymentStatus(invoiceId, "PAID", amount, "CASH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      toast.success("Invoice marked as Paid! Balance cleared.");
    },
  });

  function openPaymentForBuyer(b: StoreBuyerRecord) {
    setPaymentBuyer(b);
    setPaymentAmount(b.balanceDue > 0 ? String(b.balanceDue) : "");
    setShowPaymentModal(true);
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Customer Khata & Store Ledger
              </h1>
              <p className="text-xs text-muted-foreground">
                All store buyers, paid in full vs credit/due balances, invoices & receipts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (allStoreBuyers.length > 0) {
                const dueBuyer = allStoreBuyers.find((b) => b.balanceDue > 0) || allStoreBuyers[0];
                openPaymentForBuyer(dueBuyer);
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
            <span className="text-xs font-semibold">Total Receivables (Pending Due)</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-500 font-mono">
            ₹{totalReceivables.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Across {buyersWithDue.length} buyers with pending dues
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Total Paid in Full</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-500 font-mono">
            {buyersPaidInFull.length} Buyers
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Zero balance due & fully settled
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Payments Collected</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-500 font-mono">
            ₹{totalPaymentsCollected.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Direct ledger settlement receipts
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold">Total Store Buyers</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
            {allStoreBuyers.length}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Registered accounts & retail buyers
          </div>
        </div>
      </div>

      {/* Primary Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("balances")}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeTab === "balances"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Store Buyers & Balances ({allStoreBuyers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${activeTab === "transactions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Transaction Feed ({allFeedItems.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer name, phone, bill #..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>
      </div>

      {/* TAB 1: Store Buyers & Balances */}
      {activeTab === "balances" && (
        <div className="space-y-4">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter Buyers:
            </span>
            <button
              onClick={() => setBuyerFilter("ALL")}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${buyerFilter === "ALL"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
            >
              All Buyers ({allStoreBuyers.length})
            </button>
            <button
              onClick={() => setBuyerFilter("DUE")}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${buyerFilter === "DUE"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                }`}
            >
              <AlertCircle className="h-3 w-3" />
              <span>Pending Due / Unpaid ({buyersWithDue.length})</span>
            </button>
            <button
              onClick={() => setBuyerFilter("PAID")}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${buyerFilter === "PAID"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>Paid in Full ({buyersPaidInFull.length})</span>
            </button>
            <button
              onClick={() => setBuyerFilter("WHOLESALE")}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${buyerFilter === "WHOLESALE"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                }`}
            >
              Wholesale ({wholesaleBuyers.length})
            </button>
            <button
              onClick={() => setBuyerFilter("RETAIL")}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${buyerFilter === "RETAIL"
                  ? "bg-secondary text-foreground border border-border"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
            >
              Retail ({retailBuyers.length})
            </button>
          </div>

          {/* Buyers Ledger Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Customer / Buyer</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Billing Type</th>
                    <th className="py-3 px-4 text-center">Bills</th>
                    <th className="py-3 px-4 text-right">Total Billed</th>
                    <th className="py-3 px-4 text-right">Total Paid</th>
                    <th className="py-3 px-4 text-right">Balance Due (To Pay)</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedBuyers.map((b) => {
                    const hasDue = (b.balanceDue || 0) > 0;
                    const isPaid = b.paymentStatus === "PAID";
                    const isPartial = b.paymentStatus === "PARTIAL";

                    return (
                      <tr key={b.id} className="hover:bg-muted/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            <span>{b.name}</span>
                            {!b.isRegistered && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-secondary text-muted-foreground border border-border">
                                Walk-in
                              </span>
                            )}
                          </div>
                          {b.gst_number && (
                            <div className="text-[10px] font-mono text-muted-foreground">
                              GST: {b.gst_number}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {b.mobile || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {b.billModes.map((m) => (
                              <span
                                key={m}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m === "WHOLESALE"
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                    : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                  }`}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                          {b.totalBills}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                          ₹{(b.totalSpent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{(b.totalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          <span
                            className={
                              hasDue
                                ? "text-amber-500 font-black text-sm"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            ₹{(b.balanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasDue ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isPartial
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                }`}
                            >
                              <AlertCircle className="h-3 w-3" />
                              {isPartial ? "Partially Paid" : "Due Pending (Credit)"}
                            </span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" /> Paid in Full
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground border border-border">
                              No Bills
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedBuyerId(b.id)}
                              className="h-7 px-2.5 rounded-lg border border-border bg-secondary hover:bg-muted text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                              title="View Customer Statement & Invoices"
                            >
                              <FileText className="h-3 w-3 text-primary" />
                              <span>Statement ({b.totalBills})</span>
                            </button>
                            {hasDue && (
                              <button
                                onClick={() => openPaymentForBuyer(b)}
                                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                                title="Collect payment to settle balance"
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
                  {filteredBuyers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs">
                        No buyers found matching current filter or search "{search}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PaginationControls
              currentPage={buyerPage}
              totalPages={totalBuyerPages}
              totalItems={filteredBuyers.length}
              pageSize={PAGE_SIZE}
              onPageChange={setBuyerPage}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Complete Transaction Feed (Invoices + Ledger Payments) */}
      {activeTab === "transactions" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer / Buyer</th>
                  <th className="py-3 px-4">Reference / Invoice #</th>
                  <th className="py-3 px-4">Mode / Details</th>
                  <th className="py-3 px-4 text-center">Transaction Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status / Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFeed.map((item) => {
                  if (item.kind === "INVOICE") {
                    const inv = item.invoice;
                    const isPaid = inv.payment_status === "PAID" || (inv.balance_due || 0) === 0;
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition">
                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy, hh:mm a") : "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground">
                            {inv.customer_name || "Walk-in Retail Customer"}
                          </div>
                          {inv.customer_mobile && (
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {inv.customer_mobile}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground uppercase">
                              {inv.payment_method || "CASH"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border font-bold">
                              {inv.bill_mode || "RETAIL"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <ArrowUpRight className="h-3 w-3" /> Sale Debit
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-foreground">
                          + ₹{Number(inv.grand_total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                }`}
                            >
                              {isPaid ? "Paid" : "Credit"}
                            </span>
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              className="h-6 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="View & Print Bill"
                            >
                              <Eye className="h-2.5 w-2.5" />
                              <span>Bill</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // PAYMENT entry
                  const l = item.ledger;
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition bg-emerald-500/5">
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
                        {l.reference_id || "Khata Receipt"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground uppercase">{l.payment_mode || "—"}</span>
                          {l.notes && <span className="text-[11px] text-muted-foreground">({l.notes})</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <ArrowDownLeft className="h-3 w-3" /> Payment Received
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        - ₹{Number(l.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Bal: ₹{Number(l.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {allFeedItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                      No transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={feedPage}
            totalPages={totalFeedPages}
            totalItems={allFeedItems.length}
            pageSize={PAGE_SIZE}
            onPageChange={setFeedPage}
          />
        </div>
      )}

      {/* MODAL 1: Settle / Record Payment */}
      {showPaymentModal && paymentBuyer && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-base text-foreground">Record Payment / Khata Settlement</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Buyer Info Card */}
            <div className="p-3.5 rounded-xl bg-secondary/60 border border-border space-y-1">
              <div className="text-xs text-muted-foreground">Paying Customer</div>
              <div className="font-bold text-sm text-foreground">{paymentBuyer.name}</div>
              {paymentBuyer.mobile && (
                <div className="text-xs text-muted-foreground font-mono">{paymentBuyer.mobile}</div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                <span className="text-xs text-muted-foreground font-medium">Outstanding Balance:</span>
                <span className="text-sm font-bold font-mono text-amber-500">
                  ₹{(paymentBuyer.balanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
                      className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${paymentMode === mode
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
                  className="w-full h-9 px-3 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
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

      {/* MODAL 2: Customer / Buyer Statement & Invoices */}
      {selectedBuyer && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-3 sm:p-6">
          <div className="bg-card border border-border w-full max-w-4xl rounded-2xl shadow-2xl p-6 space-y-6 max-h-[88vh] my-auto overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center text-primary">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-foreground">
                      Account Statement — {selectedBuyer.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedBuyer.balanceDue > 0
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}
                    >
                      {selectedBuyer.balanceDue > 0 ? "Pending Due" : "Paid in Full"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Phone: {selectedBuyer.mobile || "N/A"} | Registered:{" "}
                    {selectedBuyer.isRegistered ? "Account Member" : "Direct Buyer"}
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
                  onClick={() => setSelectedBuyerId(null)}
                  className="h-8 w-8 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-mono grid place-items-center cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-center">
                <div className="text-[11px] text-muted-foreground font-semibold">Total Purchases / Invoiced</div>
                <div className="text-base font-bold font-mono text-foreground mt-0.5">
                  ₹{(selectedBuyer.totalSpent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-center">
                <div className="text-[11px] text-muted-foreground font-semibold">Current Balance Due</div>
                <div
                  className={`text-base font-bold font-mono mt-0.5 ${selectedBuyer.balanceDue > 0 ? "text-amber-500 font-black" : "text-emerald-500"
                    }`}
                >
                  ₹{(selectedBuyer.balanceDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-center flex flex-col justify-center items-center">
                <button
                  onClick={() => openPaymentForBuyer(selectedBuyer)}
                  className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Collect Payment</span>
                </button>
              </div>
            </div>

            {/* Invoices History Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Invoices History ({selectedBuyer.invoices.length})</span>
                <span className="text-[11px] font-normal lowercase text-muted-foreground">
                  Click 'View Bill' to inspect or print receipt (20 per page)
                </span>
              </h4>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Items Purchased</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Due</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedModalInvoices.map((inv) => {
                      const isPaid = inv.payment_status === "PAID" || (inv.balance_due || 0) === 0;
                      const itemsSummary = inv.items && inv.items.length > 0
                        ? inv.items.map((it: any) => `${it.qty || 1}x ${it.product_name || it.name || "Item"}`).join(", ")
                        : "—";

                      return (
                        <tr key={inv.id} className="hover:bg-muted/20 transition">
                          <td className="py-2 px-3 font-mono font-bold text-primary">
                            {inv.invoice_number}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground font-mono">
                            {inv.created_at ? format(new Date(inv.created_at), "dd MMM yyyy") : "—"}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-foreground border border-border">
                              {inv.bill_mode || "RETAIL"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate" title={itemsSummary}>
                            {itemsSummary}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                            ₹{inv.grand_total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            ₹{inv.amount_paid?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            <span className={(inv.balance_due || 0) > 0 ? "text-amber-500" : "text-muted-foreground"}>
                              ₹{inv.balance_due?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                }`}
                            >
                              {isPaid ? "PAID" : "CREDIT"}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingInvoice(inv)}
                                className="h-6 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title="View Thermal / A4 Bill"
                              >
                                <Eye className="h-2.5 w-2.5" />
                                <span>View Bill</span>
                              </button>
                              {!isPaid && (
                                <button
                                  onClick={() =>
                                    markInvoicePaidMutation.mutate({
                                      invoiceId: inv.id,
                                      amount: inv.grand_total,
                                    })
                                  }
                                  className="h-6 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                                >
                                  <span>Pay</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {selectedBuyer.invoices.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-muted-foreground text-xs">
                          No invoices generated for this buyer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={modalInvPage}
                totalPages={totalModalInvPages}
                totalItems={selectedBuyer.invoices.length}
                pageSize={PAGE_SIZE}
                onPageChange={setModalInvPage}
              />
            </div>

            {/* Customer Ledger Statement */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Ledger Entries & Running Balance ({selectedBuyerLedger.length})</span>
                <span className="text-[11px] font-normal lowercase text-muted-foreground">
                  Receipts & Khata settlements (20 per page)
                </span>
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
                    {paginatedModalLedger.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="py-2 px-3 font-mono text-muted-foreground">
                          {row.date ? format(new Date(row.date), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {row.type === "DEBIT" ? (
                            <span className="text-rose-600 dark:text-rose-400">Debit (Invoice)</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">Credit (Payment)</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          <span className="font-mono text-foreground">{row.reference_id}</span>
                          {row.notes && <span className="ml-1 text-[11px]">({row.notes})</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          {row.type === "DEBIT"
                            ? `₹${Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {row.type === "CREDIT"
                            ? `₹${Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                            : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-foreground">
                          ₹{Number(row.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {selectedBuyerLedger.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                          No direct ledger receipts logged for this buyer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={modalLedgerPage}
                totalPages={totalModalLedgerPages}
                totalItems={selectedBuyerLedger.length}
                pageSize={PAGE_SIZE}
                onPageChange={setModalLedgerPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Bill Modal */}
      {viewingInvoice && (
        <BillViewerModal
          invoice={viewingInvoice}
          items={viewingInvoice.items}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
}
