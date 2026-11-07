import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";
import { db } from "@/lib/db/db";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Settings as SettingsIcon,
  Store,
  Home,
} from "lucide-react";

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

  const shopName = db.getSettings()?.shop_name || "MSS Ponkumar Store";

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] relative">
      {/* ── Light Transparent Store Name Watermark in Background (Straight) ── */}
      <div
        className="pointer-events-none select-none fixed inset-0 flex flex-col items-center justify-center z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="text-center flex flex-col items-center gap-2.5 opacity-[0.09]">
          <div
            className="font-black uppercase text-[#1B2D6B]"
            style={{ fontSize: "clamp(42px, 8vw, 110px)", letterSpacing: "0.18em", lineHeight: 1.05 }}
          >
            MSS PONKUMAR STORE
          </div>
          <div
            className="font-black uppercase text-[#E8151B]"
            style={{ fontSize: "clamp(22px, 4.2vw, 56px)", letterSpacing: "0.4em" }}
          >
            WHOLESALE SHOP
          </div>
          <div
            className="font-bold uppercase text-[#1B2D6B] mt-1"
            style={{ fontSize: "clamp(12px, 2vw, 22px)", letterSpacing: "0.25em" }}
          >
            OFFLINE BILLDESK POS
          </div>
        </div>
      </div>

      {/* TOP HEADER — Clean White Theme with Navy & Red Palette */}
      <header className="h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md flex items-center justify-between gap-3 px-4 shrink-0 sticky top-0 z-30 shadow-xs print:hidden">
        {/* Left: Brand with Official Logo (Clean, no second line) */}
        <Link to="/apps" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-white border border-[#CBD5E1] p-1 grid place-items-center group-hover:scale-105 transition shadow-xs overflow-hidden shrink-0">
            <img
              src="/mss-logo.png"
              alt="MSS Ponkumar Store"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-base font-black text-[#1B2D6B] tracking-tight flex items-center gap-2">
            <span>{shopName}</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E8151B] text-white shadow-xs">
              WHOLESALE
            </span>
          </div>
        </Link>

        {/* Right: Home + New Sale + Settings */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            to="/apps"
            title="Home"
            className="h-9 px-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#1B2D6B] text-xs font-bold flex items-center gap-1.5 transition shadow-xs active:scale-95"
          >
            <Home className="h-4 w-4 text-[#1B2D6B]" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          <Link
            to="/pos"
            className="h-9 px-3.5 sm:px-4 rounded-lg bg-[#E8151B] hover:bg-[#c90f14] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Sale</span>
          </Link>

          <Link
            to="/settings"
            title="Settings"
            className="h-9 w-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] grid place-items-center text-[#64748B] hover:text-[#1B2D6B] transition shadow-xs"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto relative z-10 print:overflow-visible print:h-auto">
        <Outlet />
      </main>
    </div>
  );
}
