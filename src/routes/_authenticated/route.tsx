import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { db } from "@/lib/db/db";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Settings as SettingsIcon,
  Store,
  Home,
  Receipt,
  Users,
  Package,
  Landmark,
  Keyboard as KeyboardIcon,
} from "lucide-react";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = useAuth.getState().user;
    return { userId: user.id, username: user.username, role: user.role };
  },
  component: Shell,
});

function Shell() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      // F12 or '?' to open shortcuts modal
      if (e.key === "F12" || (!isInput && e.key === "?")) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Alt + Number / Key navigation
      if (e.altKey && !e.ctrlKey) {
        if (e.key === "1") {
          e.preventDefault();
          navigate({ to: "/pos" });
        } else if (e.key === "2") {
          e.preventDefault();
          navigate({ to: "/inventory" });
        } else if (e.key === "3" || e.key.toLowerCase() === "c") {
          e.preventDefault();
          navigate({ to: "/customers" });
        } else if (e.key === "4" || e.key.toLowerCase() === "h") {
          e.preventDefault();
          navigate({ to: "/invoices" });
        } else if (e.key === "5" || e.key.toLowerCase() === "l") {
          e.preventDefault();
          navigate({ to: "/low-stock" });
        } else if (e.key === "6" || e.key.toLowerCase() === "r") {
          e.preventDefault();
          navigate({ to: "/ledger" });
        } else if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          navigate({ to: "/settings" });
        }
      }

      // Ctrl + B for Billing POS
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "b" && !isInput) {
        e.preventDefault();
        navigate({ to: "/pos" });
      }

      // Ctrl + I for Inventory
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === "i" && !isInput) {
        e.preventDefault();
        navigate({ to: "/inventory" });
      }

      // Ctrl + , for Settings
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        navigate({ to: "/settings" });
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [navigate]);

  // Immediately sync on mount and periodically refresh SQLite server store
  useEffect(() => {
    let active = true;

    // 1. Immediate sync on page mount
    db.fetchFromServer().then((updated) => {
      if (active && updated) {
        queryClient.invalidateQueries();
      }
    });

    // 2. Periodic sync every 10 seconds
    const interval = setInterval(async () => {
      if (!db.isLoaded) return;
      const oldStoreStr = JSON.stringify(db.getStore());
      const updated = await db.fetchFromServer();
      const newStoreStr = JSON.stringify(db.getStore());
      if (active && updated && oldStoreStr !== newStoreStr) {
        queryClient.invalidateQueries();
      }
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [queryClient]);

  const shopName = db.getSettings()?.shop_name || "MSS Ponkumar Store";

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] relative">
      {/* ── Light Transparent Store Name Watermark in Background (Straight) ── */}
      <div
        className="pointer-events-none select-none fixed inset-0 flex flex-col items-center justify-center z-0 overflow-hidden px-4"
        aria-hidden="true"
      >
        <div className="text-center flex flex-col items-center gap-2 opacity-[0.08] max-w-full">
          <div
            className="font-black uppercase text-[#1B2D6B] max-w-full truncate"
            style={{ fontSize: "clamp(22px, 5.5vw, 110px)", letterSpacing: "0.14em", lineHeight: 1.1 }}
          >
            MSS PONKUMAR STORE
          </div>
          <div
            className="font-black uppercase text-[#E8151B]"
            style={{ fontSize: "clamp(13px, 3.2vw, 56px)", letterSpacing: "0.3em" }}
          >
            WHOLESALE SHOP
          </div>
          <div
            className="font-bold uppercase text-[#1B2D6B] mt-0.5"
            style={{ fontSize: "clamp(9px, 1.8vw, 22px)", letterSpacing: "0.2em" }}
          >
            OFFLINE BILLDESK POS
          </div>
        </div>
      </div>

      {/* TOP HEADER — Clean White Theme with Navy & Red Palette */}
      <header className="h-14 sm:h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 shrink-0 sticky top-0 z-20 shadow-xs print:hidden">
        {/* Left: Brand with Official Logo (Clean, no second line) */}
        <Link to="/apps" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-white border border-[#CBD5E1] p-1 grid place-items-center group-hover:scale-105 transition shadow-xs overflow-hidden shrink-0">
            <img
              src="/mss-logo.png"
              alt="MSS Ponkumar Store"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-sm sm:text-base font-black text-[#1B2D6B] tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="truncate">{shopName}</span>
            <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-[#E8151B] text-white shadow-xs shrink-0">
              WHOLESALE
            </span>
          </div>
        </Link>

        {/* Right: Home + Shortcuts (F12) + New Sale (Desktop Only) + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <Link
            to="/apps"
            title="Home"
            className="h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1B2D6B] text-xs font-bold flex items-center gap-1.5 transition shadow-xs active:scale-95"
          >
            <Home className="h-4 w-4 text-[#1B2D6B]" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          {/* Keyboard Shortcuts Trigger Button */}
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard Shortcuts (F12 or ?)"
            className="h-8.5 px-2 sm:h-9 sm:px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#1B2D6B] flex items-center gap-1.5 transition shadow-xs text-xs font-bold active:scale-95"
          >
            <KeyboardIcon className="h-4 w-4 text-[#1B2D6B]" />
            <span className="hidden lg:inline text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">F12</span>
          </button>

          {/* POS Billing: Desktop Only */}
          <Link
            to="/pos"
            className="hidden md:flex h-9 px-3.5 sm:px-4 rounded-lg bg-[#E8151B] hover:bg-[#c90f14] text-white text-xs font-bold items-center gap-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Sale</span>
          </Link>

          <Link
            to="/settings"
            title="Settings (Alt+S)"
            className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] grid place-items-center text-[#64748B] hover:text-[#1B2D6B] transition shadow-xs"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto relative print:overflow-visible print:h-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Global Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Mobile Bottom Navigation — only on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] px-2 z-20 md:hidden print:hidden">
        <div className="flex items-center justify-around py-2 pb-safe">
          {[
            { label: "Home", icon: "Home", to: "/" },
            { label: "Invoices", icon: "Receipt", to: "/invoices" },
            { label: "Customer", icon: "Users", to: "/customers" },
            { label: "Stock", icon: "Package", to: "/inventory" },
            { label: "Ledger", icon: "Landmark", to: "/ledger" },
          ].map((item) => {
            const icons: any = { Home, Receipt, Users, Package, Landmark, Settings: SettingsIcon };
            const Icon = icons[item.icon] || Home;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl min-w-[52px] active:scale-90 transition-transform text-slate-500"
                activeProps={{ className: "text-[#1B2D6B] font-black" }}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
