import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { db } from "@/lib/db/db";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Search,
  Plus,
  Grid2X2,
  ShoppingCart,
  Receipt,
  Users,
  Landmark,
  Server,
  Settings as SettingsIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = useAuth.getState().user;
    if (!user) throw redirect({ to: "/auth" });
    if (
      user.role?.toLowerCase() === "cashier" &&
      !location.pathname.startsWith("/pos") &&
      !location.pathname.startsWith("/invoices")
    ) {
      throw redirect({ to: "/pos" });
    }
    return { userId: user.id, username: user.username, role: user.role };
  },
  component: Shell,
});

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const queryClient = useQueryClient();

  const isCashier = user?.role?.toLowerCase() === "cashier";

  // Periodically refresh SQLite server store
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (!db.isLoaded) return;
      const oldStoreStr = JSON.stringify(db.getStore());
      const updated = await db.fetchFromServer();
      const newStoreStr = JSON.stringify(db.getStore());

      if (active && updated && oldStoreStr !== newStoreStr) {
        queryClient.invalidateQueries();
      }
    }, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [queryClient]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSignOut() {
    logout();
    navigate({ to: "/auth", replace: true });
  }

  const shopName = db.getSettings()?.shop_name || "Kairos Bills";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* TOP HEADER / APP BAR */}
      <header className="h-14 border-b border-border bg-card/70 backdrop-blur-md flex items-center justify-between gap-3 px-4 shrink-0 sticky top-0 z-30 shadow-xs print:hidden">
        {/* Left: Brand & Home/Apps Button */}
        <div className="flex items-center gap-3">
          <Link to={isCashier ? "/pos" : "/apps"} className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-white border border-primary/30 p-1 grid place-items-center group-hover:scale-105 transition shadow-xs overflow-hidden shrink-0">
              <img src="/kairos-bills-logo.png" alt="Kairos Bills" className="h-full w-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-black text-foreground group-hover:text-primary transition tracking-tight flex items-center gap-1.5">
                <span>{shopName}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/20">Cloud</span>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono tracking-wider">
                Smart Retail & Ledger
              </div>
            </div>
          </Link>

          <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

          {/* Quick Module Navigation Links */}
          <div className="flex items-center gap-1">
            {!isCashier && (
              <Link
                to="/apps"
                className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  location.pathname === "/apps"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                title="All Apps"
              >
                <Grid2X2 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Apps</span>
              </Link>
            )}

            <Link
              to="/pos"
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                location.pathname.startsWith("/pos")
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              title="POS Billing"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>POS</span>
            </Link>

            <Link
              to="/invoices"
              className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                location.pathname.startsWith("/invoices")
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              title="Invoices"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Invoices</span>
            </Link>

            {!isCashier && (
              <>
                <Link
                  to="/customers"
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    location.pathname.startsWith("/customers")
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  title="Customers"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Customers</span>
                </Link>

                <Link
                  to="/ledger"
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    location.pathname.startsWith("/ledger")
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  title="Khata Ledger"
                >
                  <Landmark className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Ledger</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Center: Search */}
        <div className="relative flex-1 max-w-xs md:max-w-sm mx-1 hidden sm:block">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="global-search"
            placeholder="Quick search products or customers..."
            className="w-full h-8 pl-8 pr-7 rounded-lg bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate({ to: "/pos" });
              }
            }}
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1 py-0.2 rounded border border-border text-muted-foreground font-mono">
            /
          </kbd>
        </div>

        {/* Right: Server Status + New Sale + User Profile & Sign Out */}
        <div className="flex items-center gap-2">
          {/* Server Host Status Pill */}
          <Link
            to="/settings"
            title="Local SQLite Server Host Online — Click to view Mobile Access IPs & VPN"
            className="h-8 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          >
            <Server className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="hidden md:inline">Server Online</span>
          </Link>

          <Link
            to="/pos"
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">New Sale</span>
          </Link>

          {!isCashier && (
            <Link
              to="/settings"
              title="Settings"
              className="h-8 w-8 rounded-lg border border-border bg-card hover:bg-secondary grid place-items-center text-muted-foreground hover:text-foreground transition"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </Link>
          )}

          <div className="h-8 pl-2 pr-2 rounded-lg border border-border flex items-center gap-2 text-xs bg-card">
            <div className="h-5 w-5 rounded-full bg-primary/20 border border-primary/40 grid place-items-center text-[9px] font-bold font-mono text-primary">
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="font-semibold text-foreground hidden sm:inline text-xs">
              {user?.username ?? "admin"}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-muted-foreground hover:text-destructive p-1 transition ml-0.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto bg-background print:overflow-visible print:h-auto">
        <Outlet />
      </main>
    </div>
  );
}
