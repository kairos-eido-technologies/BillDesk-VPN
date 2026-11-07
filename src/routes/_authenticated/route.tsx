import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { db } from "@/lib/db/db";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  Plus,
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

  function handleSignOut() {
    logout();
    navigate({ to: "/auth", replace: true });
  }

  const shopName = db.getSettings()?.shop_name || "MSS Ponkumar Store";

  return (
    <div className="min-h-screen flex flex-col text-foreground" style={{ background: '#0F1A3E' }}>
      {/* TOP HEADER */}
      <header
        className="h-14 border-b flex items-center justify-between gap-3 px-4 shrink-0 sticky top-0 z-30 print:hidden"
        style={{ background: '#162044', borderColor: '#243068' }}
      >
        {/* Left: Brand */}
        <Link to={isCashier ? "/pos" : "/apps"} className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-white border border-white/20 p-0.5 grid place-items-center group-hover:scale-105 transition shadow overflow-hidden shrink-0">
            <div className="text-[8px] font-black text-center leading-tight" style={{ color: '#1B2D6B' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#1B2D6B' }}>MSS</div>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-black text-white group-hover:opacity-80 transition tracking-tight flex items-center gap-1.5">
              <span>{shopName}</span>
              <span
                className="text-[9px] font-bold px-1.5 py-px rounded"
                style={{ background: '#E8151B', color: '#fff' }}
              >
                WHOLESALE
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-wider" style={{ color: '#8B9CC5' }}>
              BillDesk POS · Offline
            </div>
          </div>
        </Link>

        {/* Right: New Sale + Settings + User */}
        <div className="flex items-center gap-2">
          <Link
            to="/pos"
            className="h-9 px-4 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
            style={{ background: '#E8151B' }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Sale</span>
          </Link>

          {!isCashier && (
            <Link
              to="/settings"
              title="Settings"
              className="h-9 w-9 rounded-lg border flex items-center justify-center transition"
              style={{ background: '#1A2755', borderColor: '#243068', color: '#8B9CC5' }}
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
          )}

          <div className="h-9 px-2 rounded-lg border flex items-center gap-2 text-xs" style={{ background: '#1A2755', borderColor: '#243068' }}>
            <div
              className="h-6 w-6 rounded-full grid place-items-center text-[10px] font-bold font-mono text-white"
              style={{ background: '#1B2D6B', border: '1.5px solid #E8151B' }}
            >
              {user?.username?.[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="font-semibold text-white hidden sm:inline text-xs">
              {user?.username ?? "admin"}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1 transition ml-0.5 cursor-pointer"
              style={{ color: '#8B9CC5' }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto print:overflow-visible print:h-auto" style={{ background: '#0F1A3E' }}>
        <Outlet />
      </main>
    </div>
  );
}
