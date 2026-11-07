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
      {/* ── Subtle Background Watermark of Shop Name ── */}
      <div
        className="pointer-events-none select-none fixed bottom-6 right-8 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="text-right flex flex-col items-end opacity-[0.045]">
          <div
            className="font-black uppercase text-[#1B2D6B]"
            style={{ fontSize: "clamp(20px, 3.5vw, 38px)", letterSpacing: "0.15em", lineHeight: 1.1 }}
          >
            MSS PONKUMAR STORE
          </div>
          <div
            className="font-black uppercase text-[#E8151B]"
            style={{ fontSize: "clamp(11px, 1.8vw, 18px)", letterSpacing: "0.35em" }}
          >
            WHOLESALE SHOP
          </div>
        </div>
      </div>

      {/* TOP HEADER — Clean White Theme with Navy & Red Palette */}
      <header className="h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md flex items-center justify-between gap-3 px-4 shrink-0 sticky top-0 z-30 shadow-xs print:hidden">
        {/* Left: Brand with Official Logo */}
        <Link to="/apps" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-xl bg-white border border-[#CBD5E1] p-1 grid place-items-center group-hover:scale-105 transition shadow-xs overflow-hidden shrink-0">
            <img
              src="/mss-logo.png"
              alt="MSS Ponkumar Store"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="text-sm font-black text-[#1B2D6B] tracking-tight flex items-center gap-2">
              <span>{shopName}</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E8151B] text-white shadow-xs">
                WHOLESALE
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#64748B] tracking-wider">
              Offline POS · Direct Desk
            </div>
          </div>
        </Link>

        {/* Right: New Sale + Settings */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/pos"
            className="h-9 px-4 rounded-lg bg-[#E8151B] hover:bg-[#c90f14] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
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

          {/* Admin Tag */}
          <div className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-2 text-xs">
            <div className="h-5 w-5 rounded-full bg-[#1B2D6B] grid place-items-center text-[10px] font-bold text-white">
              A
            </div>
            <span className="font-bold text-[#1B2D6B] text-xs">
              Admin
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto relative z-10 print:overflow-visible print:h-auto">
        <Outlet />
      </main>
    </div>
  );
}
