import { useState, useEffect } from "react";
import { X, Keyboard, Zap, Navigation, ShoppingCart, Package } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Keyboard Shortcuts</h2>
              <p className="text-xs text-muted-foreground">High-speed counter billing & navigation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm divide-y divide-border">
          {/* Section 1: POS Billing */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <ShoppingCart className="h-4 w-4" />
              <span>POS Billing Counter (At /pos)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ShortcutRow keys={["F1"]} label="Focus Barcode / Product Search" />
              <ShortcutRow keys={["F2"]} label="Toggle Retail / Wholesale Rate" />
              <ShortcutRow keys={["F3"]} label="Focus Customer Mobile Field" />
              <ShortcutRow keys={["F4"]} label="Focus Bill Discount Input" />
              <ShortcutRow keys={["F5"]} label="Pay with Cash" />
              <ShortcutRow keys={["F6"]} label="Pay with UPI / QR" />
              <ShortcutRow keys={["F7"]} label="Pay with Card" />
              <ShortcutRow keys={["F8"]} label="Credit / Pay Later (Khata)" />
              <ShortcutRow keys={["F9", "Ctrl+Enter"]} label="Save & Print Bill (Checkout)" />
              <ShortcutRow keys={["F10"]} label="Clear Entire Cart" />
              <ShortcutRow keys={["+", "-"]} label="Increase / Decrease Last Item Qty" />
              <ShortcutRow keys={["Del"]} label="Remove Selected / Last Item" />
            </div>
          </div>

          {/* Section 2: Global Navigation */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Navigation className="h-4 w-4" />
              <span>Global App Navigation (Anywhere)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ShortcutRow keys={["Alt+1", "Ctrl+B"]} label="Go to POS Billing Counter" />
              <ShortcutRow keys={["Alt+2", "Ctrl+I"]} label="Go to Inventory & Products" />
              <ShortcutRow keys={["Alt+3", "Ctrl+C"]} label="Go to Customers & Khata" />
              <ShortcutRow keys={["Alt+4", "Ctrl+H"]} label="Go to Invoices / Billing Hub" />
              <ShortcutRow keys={["Alt+5", "Ctrl+L"]} label="Go to Low Stock Alerts" />
              <ShortcutRow keys={["Alt+6", "Ctrl+R"]} label="Go to Ledger & Reports" />
              <ShortcutRow keys={["Alt+S", "Ctrl+,"]} label="Go to Store Settings" />
              <ShortcutRow keys={["F12", "?"]} label="Open this Shortcuts Guide" />
            </div>
          </div>

          {/* Section 3: Inventory & Dialogs */}
          <div className="pt-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Package className="h-4 w-4" />
              <span>Inventory & Windows</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <ShortcutRow keys={["Alt+N"]} label="Create New Product (in Inventory)" />
              <ShortcutRow keys={["Ctrl+F"]} label="Focus Search Bar" />
              <ShortcutRow keys={["Esc"]} label="Close Active Modal / Preview" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Shortcuts work seamlessly on Windows & Desktop
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60 hover:border-primary/40 transition">
      <span className="text-xs text-foreground font-medium truncate pr-2">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k) => (
          <kbd
            key={k}
            className="px-2 py-0.5 rounded bg-card border border-border text-[11px] font-mono font-bold text-foreground shadow-xs"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

