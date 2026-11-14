import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db, InventoryItem } from "@/lib/db/db";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCart, computeTotals } from "@/lib/cart-store";
import { inr, qty } from "@/lib/format";
import { Trash2, ScanBarcode, UserPlus, Search, Printer, ChevronDown, Percent, RotateCcw, Bookmark, X, Plus, Check, Phone, User, AlertCircle } from "lucide-react";
import { BillViewerModal } from "@/components/BillViewerModal";
import { useT } from "@/lib/lang/lang-context";
import { Customer } from "@/lib/db/db";

export const Route = createFileRoute("/_authenticated/pos")({ component: POSPage });

function POSPage() {
  const t = useT();
  const cart = useCart();
  const totals = computeTotals(cart as any);
  const [scan, setScan] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("thermal");
  const [printedInvoiceData, setPrintedInvoiceData] = useState<{ invoice: any; items: any[] } | null>(null);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [paymentStatusOption, setPaymentStatusOption] = useState<"PAID" | "UNPAID" | "PARTIAL">("PAID");
  const [partialAmountPaid, setPartialAmountPaid] = useState<string>("");
  const [billMode, setBillMode] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [globalGstRate, setGlobalGstRate] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customGst, setCustomGst] = useState("0");
  const scanRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ["pos-customers"],
    queryFn: async () => {
      await db.loadPromise;
      return db.getCustomers();
    },
  });
  const allCustomers = customersQuery.data || [];

  function handleModeChange(mode: 'RETAIL' | 'WHOLESALE') {
    setBillMode(mode);
    cart.lines.forEach((l) => {
      const prod = db.getProductById(l.product_id);
      if (prod) {
        const targetPrice = mode === 'WHOLESALE' && prod.wholesale_price && prod.wholesale_price > 0
          ? Number(prod.wholesale_price)
          : Number(prod.selling_price);
        l.price = targetPrice;
      }
    });
    if (cart.lines.length > 0) {
      cart.setQty(cart.lines[0].product_id, cart.lines[0].qty);
    }
    toast.success(`Switched to ${mode} Billing`);
  }

  function handleApplyGlobalGst(val: string) {
    setGlobalGstRate(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      cart.lines.forEach((l) => {
        cart.setLineGstRate(l.product_id, parsed);
      });
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("pos_held_bills");
      if (stored) {
        setHeldBills(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  function handleHoldBill() {
    if (cart.lines.length === 0) return;
    const newHold = {
      id: "hold-" + Date.now(),
      timestamp: new Date().toISOString(),
      customerName: cart.customerName || "Walk-in Customer",
      customerMobile: cart.customerMobile || "",
      lines: cart.lines,
      customerId: cart.customerId,
      loyaltyAvailable: cart.loyaltyAvailable,
      loyaltyRedeem: cart.loyaltyRedeem,
      invoiceDiscount: cart.invoiceDiscount,
      gstEnabled: cart.gstEnabled,
      payments: cart.payments,
    };
    const updated = [newHold, ...heldBills];
    setHeldBills(updated);
    localStorage.setItem("pos_held_bills", JSON.stringify(updated));
    cart.clear();
    toast.success("Bill put on hold successfully!");
  }

  function handleResumeBill(hold: any) {
    cart.loadCart({
      lines: hold.lines,
      customerId: hold.customerId,
      customerMobile: hold.customerMobile,
      customerName: hold.customerName,
      loyaltyAvailable: hold.loyaltyAvailable,
      loyaltyRedeem: hold.loyaltyRedeem,
      invoiceDiscount: hold.invoiceDiscount,
      gstEnabled: hold.gstEnabled,
      payments: hold.payments,
    });
    const updated = heldBills.filter((b) => b.id !== hold.id);
    setHeldBills(updated);
    localStorage.setItem("pos_held_bills", JSON.stringify(updated));
    setShowHeldBillsModal(false);
    toast.success(`Resumed bill for ${hold.customerName}`);
  }

  function handleDeleteHeldBill(holdId: string) {
    const updated = heldBills.filter((b) => b.id !== holdId);
    setHeldBills(updated);
    localStorage.setItem("pos_held_bills", JSON.stringify(updated));
    toast.success("Held bill deleted");
  }

  // Fetch real installed printers from server
  const printersQuery = useQuery({
    queryKey: ["system-printers"],
    queryFn: async () => {
      const res = await fetch("/api/printers");
      if (!res.ok) return { printers: [] as string[] };
      return res.json() as Promise<{ printers: string[] }>;
    },
    staleTime: 30_000,
    retry: false,
  });
  const systemPrinters: string[] = printersQuery.data?.printers ?? [];

  useEffect(() => { scanRef.current?.focus(); }, []);

  const products = useQuery({
    queryKey: ["pos-local-products", search],
    queryFn: async () => {
      await db.loadPromise;
      const all = db.getInventory();
      if (!search.trim()) return all.slice(0, 30);
      const clean = search.toLowerCase().trim();
      return all.filter((p) => {
        const nameMatch = (p.name || "").toLowerCase().includes(clean);
        const barcodeMatch = (p.barcode || "").toLowerCase().includes(clean);
        const catMatch = (p.category || "").toLowerCase().includes(clean);
        const skuMatch = (p.sku_code || "").toLowerCase().includes(clean);
        return nameMatch || barcodeMatch || catMatch || skuMatch;
      });
    },
  });

  function handleAddCustomProduct(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customName.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    const qtyNum = parseFloat(customQty) || 1;
    const gstRateNum = cart.gstEnabled
      ? (globalGstRate !== '' ? (parseFloat(globalGstRate) || 0) : (parseFloat(customGst) || 0))
      : 0;

    const customId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    cart.addOrIncrement({
      product_id: customId,
      name: customName.trim(),
      barcode: "CUSTOM",
      price: priceNum,
      mrp: priceNum,
      gst_rate: gstRateNum,
      stock_qty: 9999,
      qty: qtyNum,
    });

    toast.success(`Added custom item: ${customName.trim()} (₹${priceNum})`);
    setShowCustomModal(false);
    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setCustomGst("0");
  }

  function handleScan(code: string) {
    if (!code.trim()) return;
    const item = db.getProductByBarcode(code.trim());
    if (!item) {
      toast.error("Barcode not found in local catalog: " + code);
      setScan("");
      return;
    }

    const shopQty = Number(item.stock_qty || 0);

    const itemPrice = billMode === 'WHOLESALE' && (item as any).wholesale_price && (item as any).wholesale_price > 0
      ? Number((item as any).wholesale_price)
      : Number(item.selling_price);

    const itemGst = cart.gstEnabled
      ? (globalGstRate !== '' ? (parseFloat(globalGstRate) || 0) : Number(item.gst_rate || 0))
      : 0;

    cart.addOrIncrement({
      product_id: item.id,
      name: item.name,
      barcode: item.barcode,
      price: itemPrice,
      mrp: Number(item.mrp ?? itemPrice),
      gst_rate: itemGst,
      stock_qty: shopQty,
    });
    toast.success(`Scanned: ${item.name} (${billMode} ₹${itemPrice})`);
    setScan("");
  }

  function handleProductClick(p: InventoryItem) {
    const shopQty = Number(p.stock_qty || 0);

    const itemPrice = billMode === 'WHOLESALE' && (p as any).wholesale_price && (p as any).wholesale_price > 0
      ? Number((p as any).wholesale_price)
      : Number(p.selling_price);

    const itemGst = cart.gstEnabled
      ? (globalGstRate !== '' ? (parseFloat(globalGstRate) || 0) : Number(p.gst_rate || 0))
      : 0;

    cart.addOrIncrement({
      product_id: p.id,
      name: p.name,
      barcode: p.barcode,
      price: itemPrice,
      mrp: Number(p.mrp ?? itemPrice),
      gst_rate: itemGst,
      stock_qty: shopQty,
    });
  }

  function selectCustomer(cust: Customer) {
    cart.setCustomer({
      id: cust.id,
      mobile: cust.mobile || "",
      name: cust.name || "Customer",
      loyalty: Number(cust.loyalty_points || 0),
    });
    setCustomerSearch("");
    setCustomerDropdownOpen(false);
    toast.success(`Attached customer: ${cust.name}`);
  }

  function clearCustomer() {
    cart.setCustomer({ id: null, mobile: "", name: "", loyalty: 0 });
    setCustomerSearch("");
    setCustomerDropdownOpen(false);
    toast.info("Switched to Walk-in Customer");
  }

  function lookupCustomer(mobile: string) {
    if (!mobile.trim()) return;
    const cleanDigits = mobile.replace(/\D/g, "");
    const cust = allCustomers.find((c) => c.mobile && c.mobile.replace(/\D/g, "").includes(cleanDigits)) || db.getCustomerByMobile(mobile);
    if (cust) {
      selectCustomer(cust);
    } else {
      cart.setCustomer({ id: null, mobile, name: cart.customerName || "", loyalty: 0 });
    }
  }

  // Save & Print — creates invoice in SQLite database and opens inline receipt modal
  const savePrint = useMutation({
    mutationFn: async () => {
      if (cart.lines.length === 0) throw new Error("Cart is empty");
      const amountPaid =
        paymentStatusOption === "PAID"
          ? totals.total
          : paymentStatusOption === "UNPAID"
          ? 0
          : Number(partialAmountPaid || 0);
      const balanceDue = Math.max(0, totals.total - amountPaid);

      let effectiveCustomerId = cart.customerId || undefined;
      const effectiveName = cart.customerName?.trim() || "Walk-in Customer";
      const effectiveMobile = cart.customerMobile?.trim() || "";

      // If customer is not yet linked by ID, search existing customers by mobile or name
      if (!effectiveCustomerId) {
        if (effectiveMobile) {
          const clean = effectiveMobile.replace(/\D/g, "");
          const matched = allCustomers.find((c) => c.mobile && c.mobile.replace(/\D/g, "").includes(clean));
          if (matched) effectiveCustomerId = matched.id;
        }
        if (!effectiveCustomerId && effectiveName && effectiveName.toLowerCase() !== "walk-in customer") {
          const matched = allCustomers.find((c) => c.name && c.name.toLowerCase().trim() === effectiveName.toLowerCase());
          if (matched) effectiveCustomerId = matched.id;
        }
      }

      const saleData = {
        customer_id: effectiveCustomerId,
        customer_name: effectiveName,
        customer_mobile: effectiveMobile,
        invoice_type: (cart.gstEnabled ? "GST" : "NON_GST") as any,
        bill_mode: billMode,
        subtotal: totals.subtotal,
        tax_amount: totals.gstAmount,
        discount_amount: cart.invoiceDiscount,
        exchange_amount: cart.exchangeAmount,
        exchange_notes: cart.exchangeNotes,
        grand_total: totals.total,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_method:
          paymentStatusOption === "UNPAID"
            ? ("CREDIT" as const)
            : ((cart.payments[0]?.method?.toUpperCase() || "CASH") as any),
        payment_status: paymentStatusOption,
        loyalty_points_redeemed: cart.loyaltyRedeem,
        items: cart.lines.map((l) => ({
          product_id: l.product_id,
          barcode: l.barcode || '',
          product_name: l.name,
          qty: l.qty,
          unit_price: l.price,
          mrp: l.mrp ?? l.price,
          tax_rate: l.gst_rate,
          total_price: l.qty * l.price - (l.discount || 0),
        })),
      };
      return await db.createInvoice(saleData);
    },
    onSuccess: (inv) => {
      toast.success(`Invoice ${inv.invoice_number} saved!`);
      const invItems = db.getInvoice(inv.id)?.items || cart.lines.map((l) => ({
        id: 'ii-' + Math.random(),
        invoice_id: inv.id,
        product_id: l.product_id,
        barcode: l.barcode || '',
        product_name: l.name,
        qty: l.qty,
        unit_price: l.price,
        mrp: l.mrp ?? l.price,
        tax_rate: l.gst_rate,
        total_price: l.qty * l.price,
      }));
      setPrintedInvoiceData({ invoice: inv, items: invItems });
      cart.clear();
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["pos-customers"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["ledger"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
      qc.invalidateQueries({ queryKey: ["local-settings"] });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isPending = savePrint.isPending;
  const payTotal = cart.payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="p-4 grid grid-cols-12 gap-4 min-h-[calc(100vh-4rem)]">
      {/* LEFT: Billing POS Station */}
      <div className="col-span-8 space-y-3 flex flex-col">
        {/* Bill Mode Header Toggle */}
        <div className="card-surface p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-input border border-border">
            <button
              type="button"
              onClick={() => handleModeChange('RETAIL')}
              className={`h-8 px-4 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                billMode === 'RETAIL'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🏪 Retail Bill
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('WHOLESALE')}
              className={`h-8 px-4 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                billMode === 'WHOLESALE'
                  ? 'bg-destructive text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📦 Wholesale Bill
            </button>
          </div>

          <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
            <span className="hidden sm:inline">Active Mode:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              billMode === 'WHOLESALE' ? 'bg-destructive/15 text-destructive border border-destructive/30' : 'bg-primary/15 text-primary border border-primary/30'
            }`}>
              {billMode} RATES
            </span>
          </div>
        </div>

        {/* Top Barcode, Search & Custom Item Controls */}
        <div className="card-surface p-3 flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
            <input
              ref={scanRef}
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan(scan)}
              placeholder={t("pos.scanBarcode")}
              className="w-full h-9 pl-9 pr-3 rounded bg-input border border-border text-xs font-mono focus:border-primary text-foreground"
            />
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActiveSearchIndex(0);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => setSearchFocused(false), 250);
              }}
              onKeyDown={(e) => {
                const results = products.data || [];
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveSearchIndex((prev) => Math.min(prev + 1, Math.max(0, results.length - 1)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSearchIndex((prev) => Math.max(0, prev - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (results.length > 0) {
                    const itemToAdd = results[activeSearchIndex] || results[0];
                    handleProductClick(itemToAdd);
                    toast.success(`Added ${itemToAdd.name} to bill`);
                    setSearch("");
                    setActiveSearchIndex(0);
                  }
                } else if (e.key === "Escape") {
                  setSearch("");
                  setSearchFocused(false);
                }
              }}
              placeholder={t("pos.searchProduct") + " (Search item name, barcode, category)..."}
              className="w-full h-9 pl-9 pr-8 rounded bg-input border border-border text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveSearchIndex(0);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Floating Live Product Search Results Dropdown */}
            {search.trim().length > 0 && searchFocused && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border-2 border-primary/40 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-border">
                {products.data && products.data.length > 0 ? (
                  products.data.map((p, idx) => {
                    const shopQty = Number(p.stock_qty || 0);
                    const isOutOfStock = shopQty <= 0;
                    const price = billMode === 'WHOLESALE' && (p as any).wholesale_price && (p as any).wholesale_price > 0
                      ? Number((p as any).wholesale_price)
                      : Number(p.selling_price);
                    const isSelected = idx === activeSearchIndex;

                    return (
                      <div
                        key={p.id}
                        onMouseDown={() => {
                          handleProductClick(p);
                          toast.success(`Added ${p.name} to bill`);
                          setSearch("");
                          setActiveSearchIndex(0);
                        }}
                        className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected ? "bg-primary/15 border-l-4 border-l-primary" : "hover:bg-secondary/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground truncate">{p.name}</span>
                            {p.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                {p.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground mt-0.5">
                            {p.barcode && <span>Barcode: {p.barcode}</span>}
                            <span className={isOutOfStock ? "text-rose-500 font-bold" : "text-emerald-500 font-medium"}>
                              {isOutOfStock ? "Out of Stock" : `Stock: ${qty(shopQty)}`}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black font-mono text-primary">
                            ₹{price.toFixed(2)}
                          </div>
                          {p.mrp && p.mrp > price ? (
                            <div className="text-[10px] text-muted-foreground line-through">
                              MRP: ₹{Number(p.mrp).toFixed(2)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                    <p>No products matching &ldquo;{search}&rdquo;</p>
                    <button
                      type="button"
                      onMouseDown={() => {
                        setCustomName(search);
                        setShowCustomModal(true);
                        setSearch("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add &ldquo;{search}&rdquo; as Custom Item
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition shadow-xs cursor-pointer shrink-0 w-full sm:w-auto"
            title="Add customized product and price to bill"
          >
            <Plus className="h-4 w-4" />
            <span>+ Custom Item</span>
          </button>
        </div>

        {/* Cart Line Items Table */}
        <div className="card-surface flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex justify-between items-center bg-card">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                {t("pos.cartTitle")} ({cart.lines.length} {t("pos.lineItems")})
              </span>
              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className="h-6 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                title="Add customized product and price"
              >
                <Plus className="h-3 w-3" />
                <span>Custom Item</span>
              </button>
            </div>
            <button onClick={() => cart.clear()} className="text-xs text-muted-foreground hover:text-destructive transition cursor-pointer">
              {t("pos.clearCart")}
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-card text-[10px] uppercase text-muted-foreground sticky top-0 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2.5">{t("pos.col.item")}</th>
                  <th className="text-right px-3 py-2.5 w-24">{t("pos.col.price")}</th>
                  <th className="text-center px-3 py-2.5 w-20">{t("pos.col.gst")}</th>
                  <th className="text-center px-3 py-2.5 w-20">{t("pos.col.qty")}</th>
                  <th className="text-right px-3 py-2.5 w-20">{t("pos.col.discount")}</th>
                  <th className="text-right px-3 py-2.5">{t("pos.col.subtotal")}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cart.lines.map((l) => (
                  <tr key={l.product_id} className="hover:bg-secondary/40 transition">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-foreground">{l.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                        <span>{t("pos.barcode")}: {l.barcode || 'N/A'}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                          {l.gst_rate}% GST
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <div className="font-semibold text-foreground">{inr(l.price)}</div>
                      {l.mrp && l.mrp > l.price ? (
                        <div className="text-[10px] text-muted-foreground/80 line-through">MRP: {inr(l.mrp)}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.5"
                          value={l.gst_rate}
                          onChange={(e) => cart.setLineGstRate(l.product_id, parseFloat(e.target.value) || 0)}
                          className="w-14 h-8 rounded bg-input border border-border text-center font-mono text-xs px-1 font-bold text-foreground focus:border-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min={0.1}
                        step="any"
                        value={l.qty}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          cart.setQty(l.product_id, val);
                        }}
                        className="w-16 h-8 rounded bg-input border border-border text-center font-mono text-sm focus:border-primary text-foreground font-bold"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={l.discount}
                        onChange={(e) => cart.setLineDiscount(l.product_id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 rounded bg-input border border-border text-right font-mono text-sm px-2 focus:border-primary text-foreground"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-primary">
                      {inr(l.price * l.qty - l.discount)}
                    </td>
                    <td className="px-2 text-center">
                      <button onClick={() => cart.remove(l.product_id)} className="p-1 hover:text-destructive text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm text-muted-foreground">
                      <ScanBarcode className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
                      {t("pos.emptyCart")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT: Customer & Payment Sidebar */}
      <div className="col-span-4 space-y-3 flex flex-col">
        {/* Customer Selector Card */}
        <div className="card-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-primary" /> {t("pos.customer.title")}
            </div>
            {cart.customerId && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Linked Customer
              </span>
            )}
          </div>

          {/* If customer is attached */}
          {cart.customerId ? (
            (() => {
              const cust = allCustomers.find((c) => c.id === cart.customerId);
              const due = Number(cust?.balance_due || 0);

              return (
                <div className="p-3 rounded-xl bg-secondary/60 border border-primary/30 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <User className="h-4 w-4 text-primary" />
                        <span>{cart.customerName}</span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3" />
                        <span>{cart.customerMobile || "No mobile"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Clear / Switch customer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Khata Due Balance:</span>
                    <span className={`font-bold ${due > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      ₹{due.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()
          ) : (
            /* If no customer attached yet: Search or Add Customer */
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={customerSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerSearch(val);
                    setCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerDropdownOpen(false), 250)}
                  placeholder="Search existing customer (name or phone)..."
                  className="w-full h-8 pl-8 pr-3 rounded bg-input border border-border text-xs font-mono focus:border-primary text-foreground"
                />

                {customerDropdownOpen && customerSearch.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border-2 border-primary/40 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-border">
                    {allCustomers.filter((c) =>
                      (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
                      (c.mobile || "").includes(customerSearch)
                    ).length > 0 ? (
                      allCustomers
                        .filter((c) =>
                          (c.name || "").toLowerCase().includes(customerSearch.toLowerCase()) ||
                          (c.mobile || "").includes(customerSearch)
                        )
                        .map((c) => (
                          <div
                            key={c.id}
                            onMouseDown={() => selectCustomer(c)}
                            className="p-2.5 hover:bg-secondary/60 cursor-pointer transition flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-foreground">{c.name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground">{c.mobile || "No phone"}</div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[11px] font-mono font-bold ${Number(c.balance_due || 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                Due: ₹{Number(c.balance_due || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="p-2.5 text-center text-xs text-muted-foreground">
                        No customer found. Enter details below to add.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider pt-1">
                Or Enter Customer Details
              </div>

              <div className="flex gap-2">
                <input
                  value={cart.customerMobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    cart.setCustomer({ id: cart.customerId, mobile: val, name: cart.customerName, loyalty: cart.loyaltyAvailable });
                    if (val.length === 10) {
                      lookupCustomer(val);
                    }
                  }}
                  onBlur={(e) => lookupCustomer(e.target.value)}
                  placeholder="Mobile (Numbers only)"
                  maxLength={10}
                  className="flex-1 h-8 px-3 rounded bg-input border border-border text-xs font-mono focus:border-primary text-foreground"
                />
              </div>

              <input
                value={cart.customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  cart.setCustomer({ id: cart.customerId, mobile: cart.customerMobile, name: val, loyalty: cart.loyaltyAvailable });
                }}
                placeholder="Customer Name"
                className="w-full h-8 px-3 rounded bg-input border border-border text-xs font-mono text-foreground focus:border-primary"
              />

              {cart.customerName && (
                <div className="text-[10px] text-primary flex items-center gap-1 font-medium">
                  <Check className="h-3 w-3" />
                  <span>Will be saved automatically with bill</span>
                </div>
              )}
            </div>
          )}

          {cart.loyaltyAvailable > 0 && (
            <div className="p-2.5 bg-primary/10 border border-primary/30 rounded flex justify-between items-center text-xs">
              <span className="font-semibold text-primary">{t("pos.loyalty.available")} {cart.loyaltyAvailable}</span>
              <button
                type="button"
                onClick={() => cart.setLoyaltyRedeem(Math.min(cart.loyaltyAvailable, totals.subtotal))}
                className="px-2 py-1 bg-primary text-primary-foreground rounded text-[10px] font-bold hover:opacity-90 transition"
              >
                {t("pos.loyalty.redeem")}
              </button>
            </div>
          )}
        </div>

        {/* GST Billing Toggle & Manual Rate Entry */}
        <div className="card-surface p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-emerald-400" /> GST Billing
              </div>
              <div className="text-[10px] text-muted-foreground">Toggle tax calculation</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const nextState = !cart.gstEnabled;
                cart.toggleGst(nextState);
                if (!nextState) {
                  cart.lines.forEach((l) => cart.setLineGstRate(l.product_id, 0));
                }
              }}
              className={`h-7 px-3 rounded-full text-xs font-bold transition border ${
                cart.gstEnabled ? "bg-emerald-500 text-white border-emerald-400" : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {cart.gstEnabled ? "✓ GST ON" : "GST OFF"}
            </button>
          </div>

          {cart.gstEnabled && (
            <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
              <div className="text-[10px] text-muted-foreground">Single Bill GST % (All Items):</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={globalGstRate}
                  onChange={(e) => handleApplyGlobalGst(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-16 h-7 rounded bg-input border border-border text-center font-mono text-xs px-1 font-bold text-foreground focus:border-primary"
                />
                <span className="text-[10px] text-muted-foreground font-mono">%</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="card-surface p-4 flex-1 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
              {t("pos.breakdown.title")}
            </div>

            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">{t("pos.breakdown.subtotal")}</span>
              <span className="font-semibold text-foreground">{inr(totals.subtotal)}</span>
            </div>

            {cart.gstEnabled && (
              <>
                <div className="flex justify-between text-xs font-mono text-emerald-400">
                  <span>{t("pos.breakdown.cgst")}</span>
                  <span>{inr(totals.gstAmount / 2)}</span>
                </div>
                <div className="flex justify-between text-xs font-mono text-emerald-400">
                  <span>{t("pos.breakdown.sgst")}</span>
                  <span>{inr(totals.gstAmount / 2)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <span className="text-muted-foreground">{t("pos.breakdown.billDiscount")}</span>
              <input
                type="number"
                value={cart.invoiceDiscount || ""}
                onChange={(e) => cart.setInvoiceDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-20 h-7 rounded bg-input border border-border text-right px-2 font-bold text-foreground"
              />
            </div>

            {cart.loyaltyRedeem > 0 && (
              <div className="flex justify-between text-xs font-mono text-primary">
                <span>{t("pos.breakdown.loyaltyDiscount")}</span>
                <span>-{inr(cart.loyaltyRedeem)}</span>
              </div>
            )}

            {totals.totalSavings > 0 && (
              <div className="flex justify-between items-center py-1.5 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono my-1">
                <span className="flex items-center gap-1.5">🌟 Total Saved:</span>
                <span className="text-sm">-{inr(totals.totalSavings)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-border flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">{t("pos.grandTotal")}</span>
              <span className="text-2xl font-black font-mono text-primary">{inr(totals.total)}</span>
            </div>

            {/* Payment Status & Customer Credit / Balance Option */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className="text-[11px] font-mono text-primary font-bold">
                  {paymentStatusOption === "PAID"
                    ? "Paid in Full"
                    : "Credit (Pay Later)"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatusOption("PAID")}
                  className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentStatusOption === "PAID"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>Paid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatusOption("UNPAID")}
                  className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentStatusOption === "UNPAID"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span>Pay Later (Khata)</span>
                </button>
              </div>

              {paymentStatusOption === "UNPAID" && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                  Whole {inr(totals.total)} will be added to customer&rsquo;s Khata balance due.
                </div>
              )}
            </div>
          </div>

          {/* Printer selector — live from OS */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Printer className="h-3 w-3" />
              {t("pos.printDest")}
              {printersQuery.isFetching && (
                <span className="text-[9px] text-primary animate-pulse">{t("pos.detecting")}</span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full h-9 rounded bg-input border border-border px-3 pr-8 text-xs font-mono font-semibold text-foreground appearance-none cursor-pointer"
              >
                {/* Thermal receipt option default */}
                <option value="thermal">🖨️ {t("pos.thermalPrinter")}</option>
                {/* Save as PDF */}
                <option value="__pdf__">📄 {t("pos.a4Paper")}</option>
                {/* Divider */}
                {systemPrinters.length > 0 && (
                  <option disabled value="">── Connected System Printers ──</option>
                )}
                {/* Real system printers */}
                {systemPrinters.map((p) => (
                  <option key={p} value={p}>🖨️ {p}</option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Hold & Recall Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={cart.lines.length === 0}
              onClick={handleHoldBill}
              className="h-9 rounded-lg bg-secondary hover:bg-muted border border-border text-foreground text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3.5 w-3.5 rotate-180 text-amber-400" /> {t("pos.holdBill")}
            </button>
            <button
              type="button"
              onClick={() => setShowHeldBillsModal(true)}
              className="h-9 rounded-lg bg-secondary hover:bg-muted border border-border text-foreground text-xs font-bold transition flex items-center justify-center gap-1.5 relative"
            >
              <Bookmark className="h-3.5 w-3.5 text-primary" /> {t("pos.recall")} ({heldBills.length})
            </button>
          </div>

          {/* Checkout Action Button */}
          <button
            disabled={cart.lines.length === 0 || isPending}
            onClick={() => savePrint.mutate()}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-black text-sm uppercase tracking-wider hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Printer className="h-5 w-5" />
            {savePrint.isPending ? t("pos.saving") : t("pos.savePrint")}
          </button>
        </div>
      </div>

      {printedInvoiceData && (
        <BillViewerModal
          invoiceData={printedInvoiceData}
          initialMode={selectedPrinter === "__pdf__" ? "a4" : "thermal"}
          autoPrintOnMount
          onClose={() => {
            setPrintedInvoiceData(null);
            setTimeout(() => scanRef.current?.focus(), 100);
          }}
        />
      )}

      {/* Held Bills modal overlay */}
      {showHeldBillsModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6 print:hidden"
          onClick={() => setShowHeldBillsModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 my-auto"
          >
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-primary" /> {t("pos.heldBills.title")}
              </h3>
              <button
                onClick={() => setShowHeldBillsModal(false)}
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  {t("pos.heldBills.empty")}
                </div>
              ) : (
                heldBills.map((b) => {
                  const date = new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const itemsCount = b.lines.length;
                  const total = b.lines.reduce((s: number, l: any) => s + (l.qty * l.price), 0);
                  return (
                    <div
                      key={b.id}
                      className="p-3 bg-secondary/40 border border-border rounded-lg flex justify-between items-center text-xs hover:bg-secondary transition"
                    >
                      <div>
                        <div className="font-bold text-foreground">
                          {b.customerName} {b.customerMobile ? `(${b.customerMobile})` : ""}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          {t("pos.heldBills.held")} {date} • {itemsCount} {t("pos.heldBills.items")} • {t("pos.heldBills.total")} ₹{total.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDeleteHeldBill(b.id)}
                          className="h-7 px-2.5 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold transition text-[10px] uppercase"
                        >
                          {t("pos.heldBills.delete")}
                        </button>
                        <button
                          onClick={() => handleResumeBill(b)}
                          className="h-7 px-3 rounded bg-primary text-primary-foreground font-bold hover:opacity-90 transition text-[10px] uppercase"
                        >
                          {t("pos.heldBills.resume")}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Customized Product & Price */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex justify-center items-center overflow-y-auto p-4 sm:p-6"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary grid place-items-center font-bold">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Add Custom Item to Bill</h3>
                  <p className="text-[11px] text-muted-foreground">Add customized product and price directly</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground grid place-items-center cursor-pointer text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomProduct} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Product / Item Name *
                </label>
                <input
                  required
                  autoFocus
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Special Silk Saree, Tailoring, Custom Box"
                  className="w-full h-10 px-3 rounded-xl bg-input border border-border text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Price / Rate (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      required
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 pl-7 pr-3 rounded-xl bg-input border border-border text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0.1}
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    placeholder="1"
                    className="w-full h-10 px-3 rounded-xl bg-input border border-border text-sm font-mono font-bold text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Quick Price Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-muted-foreground font-semibold">Quick Price:</span>
                {[50, 100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomPrice(String(amt))}
                    className="h-6 px-2 rounded-md bg-secondary hover:bg-muted text-[11px] font-mono font-semibold text-foreground border border-border transition cursor-pointer"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {cart.gstEnabled && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    GST Rate % (Tax)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={globalGstRate !== "" ? globalGstRate : customGst}
                      onChange={(e) => setCustomGst(e.target.value)}
                      className="w-24 h-9 px-3 rounded-xl bg-input border border-border text-xs font-mono font-bold text-center text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-xs font-mono text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="h-9 px-4 rounded-xl border border-border bg-secondary hover:bg-muted text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition shadow-xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add to Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}