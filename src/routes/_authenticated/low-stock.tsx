import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Package,
  Search,
  ArrowLeft,
  TrendingDown,
  Check,
  X,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/low-stock")({
  component: LowStockPage,
});

function LowStockPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [globalThresholdInput, setGlobalThresholdInput] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 30;

  useEffect(() => {
    let active = true;
    db.loadPromise.then(async () => {
      if (active) {
        try {
          await db.fetchFromServer();
          qc.invalidateQueries({ queryKey: ["inventory"] });
          qc.invalidateQueries({ queryKey: ["local-settings"] });
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, [qc]);

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      await db.loadPromise;
      return db.getInventory();
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["local-settings"],
    queryFn: async () => {
      await db.loadPromise;
      return db.getSettings();
    },
  });

  const globalThreshold = parseInt(String(settings?.low_stock_threshold ?? "10"), 10) || 10;

  // Compute low-stock items strictly based on global threshold
  const lowStockItems = inventory
    .filter((item) => Number(item.stock_qty || 0) <= globalThreshold)
    .sort((a, b) => {
      const aQty = Number(a.stock_qty || 0);
      const bQty = Number(b.stock_qty || 0);
      if (aQty === 0 && bQty !== 0) return -1;
      if (bQty === 0 && aQty !== 0) return 1;
      return aQty - bQty;
    });

  // Unique categories from low-stock items
  const categories = ["All", ...Array.from(new Set(lowStockItems.map((i) => i.category).filter(Boolean)))];

  // Apply search + category filter
  const filtered = lowStockItems.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.barcode.toLowerCase().includes(q);
    const matchesCat = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Reset page when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  // 30 Items per page pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice((validPage - 1) * pageSize, validPage * pageSize);
  const startIdx = filtered.length === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endIdx = Math.min(validPage * pageSize, filtered.length);

  // Stats
  const outOfStock = lowStockItems.filter((i) => Number(i.stock_qty || 0) === 0).length;
  const criticallyLow = lowStockItems.filter((i) => Number(i.stock_qty || 0) > 0 && Number(i.stock_qty || 0) <= 3).length;
  const belowThreshold = lowStockItems.length;

  function getStockColor(qty: number) {
    if (qty === 0) return "bg-red-100 text-red-700 border border-red-300";
    if (qty <= 3) return "bg-amber-100 text-amber-700 border border-amber-300";
    return "bg-yellow-100 text-yellow-700 border border-yellow-300";
  }

  function getStatusBadge(qty: number) {
    if (qty === 0)
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300 uppercase tracking-wide">Out of Stock</span>;
    if (qty <= 3)
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300 uppercase tracking-wide">Critical</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300 uppercase tracking-wide">Low</span>;
  }

  async function handleGlobalThresholdSave(val: number) {
    if (isNaN(val) || val < 1) {
      toast.error("Global threshold must be at least 1.");
      return;
    }
    try {
      db.updateSettings({ low_stock_threshold: String(val) });
      qc.invalidateQueries({ queryKey: ["local-settings"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["local-inventory-products"] });
      toast.success(`Global alert threshold updated to ${val}.`);
    } catch {
      toast.error("Failed to update global threshold.");
    }
    setGlobalThresholdInput(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/apps"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Apps
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h1 className="text-base font-bold leading-tight">Low Stock Alert</h1>
                <p className="text-xs text-muted-foreground leading-tight">Items at or below minimum threshold</p>
              </div>
            </div>
          </div>

          {/* Global Threshold Control */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <TrendingDown className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-medium text-amber-800 whitespace-nowrap">Global Alert Threshold:</span>
            {globalThresholdInput === null ? (
              <button
                className="text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
                onClick={() => setGlobalThresholdInput(String(globalThreshold))}
              >
                {globalThreshold} units
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={globalThresholdInput}
                  onChange={(e) => setGlobalThresholdInput(e.target.value)}
                  className="w-16 h-6 px-1.5 text-xs rounded-md border border-amber-400 bg-white text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGlobalThresholdSave(parseInt(globalThresholdInput, 10));
                    if (e.key === "Escape") setGlobalThresholdInput(null);
                  }}
                />
                <button
                  onClick={() => handleGlobalThresholdSave(parseInt(globalThresholdInput, 10))}
                  className="p-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGlobalThresholdInput(null)}
                  className="p-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">
        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-black text-red-700">{outOfStock}</span>
            <span className="text-xs font-semibold text-red-600 mt-1">Out of Stock</span>
            <div className="mt-1.5 h-1.5 w-8 rounded-full bg-red-300" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-black text-amber-700">{criticallyLow}</span>
            <span className="text-xs font-semibold text-amber-600 mt-1">Critically Low</span>
            <div className="mt-1.5 h-1.5 w-8 rounded-full bg-amber-300" />
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-black text-yellow-700">{belowThreshold}</span>
            <span className="text-xs font-semibold text-yellow-600 mt-1">Below Threshold</span>
            <div className="mt-1.5 h-1.5 w-8 rounded-full bg-yellow-300" />
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, category or barcode..."
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm min-w-[140px]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* ── Empty State ── */}
        {lowStockItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-9 w-9 text-green-600" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">All products are well stocked!</p>
              <p className="text-sm text-muted-foreground mt-1">No items are at or below the global minimum threshold ({globalThreshold} units).</p>
            </div>
          </div>
        )}

        {/* ── Main List (Responsive: Cards on Mobile, Table on Desktop) ── */}
        {lowStockItems.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No products match your search.
                </div>
              ) : (
                paginatedItems.map((item) => {
                  return (
                    <div key={item.id} className="p-3.5 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground leading-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.barcode} • {item.category}</p>
                        </div>
                        {getStatusBadge(Number(item.stock_qty || 0))}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            Current: {item.stock_qty} {item.unit || "pcs"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          Alert Threshold: <strong className="text-foreground">{globalThreshold} {item.unit || "pcs"}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Alert Threshold</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                        No products match your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          {/* Product */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground leading-tight text-sm">{item.name}</p>
                                {item.barcode && (
                                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.barcode}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                              {item.category || "—"}
                            </span>
                          </td>

                          {/* Stock */}
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${getStockColor(Number(item.stock_qty || 0))}`}>
                              {item.stock_qty} {item.unit || ""}
                            </span>
                          </td>

                          {/* Alert Threshold (Global) */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-semibold text-foreground">
                              {globalThreshold} {item.unit || "pcs"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(Number(item.stock_qty || 0))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with 30-Per-Page Pagination */}
            <div className="border-t border-border px-4 py-3 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  Showing <strong className="text-foreground">{startIdx}</strong>–<strong className="text-foreground">{endIdx}</strong> of{" "}
                  <strong className="text-foreground">{filtered.length}</strong> items (30 per page)
                </span>
                {totalPages > 1 && (
                  <span className="hidden md:inline px-2 py-0.5 rounded bg-muted font-semibold text-[11px]">
                    Page {validPage} of {totalPages}
                  </span>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={validPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - validPage) <= 1)
                      .reduce((acc: (number | string)[], p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push("...");
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground">
                            …
                          </span>
                        ) : (
                          <button
                            key={`page-${p}`}
                            onClick={() => setCurrentPage(Number(p))}
                            className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-colors ${
                              validPage === p
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "border border-border bg-card hover:bg-muted text-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                  </div>

                  <button
                    type="button"
                    disabled={validPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
