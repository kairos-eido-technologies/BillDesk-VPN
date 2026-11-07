import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db/db";
import { useState } from "react";
import { toast } from "sonner";
import {
  Server,
  Copy,
  Wifi,
  Globe,
  Shield,
  CheckCircle,
  RefreshCw,
  Smartphone,
  Download,
} from "lucide-react";
import { PageHeader } from "./dashboard";

export const Route = createFileRoute("/_authenticated/server")({
  component: ServerManagementPage,
});

function ServerManagementPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const serverInfo = useQuery({
    queryKey: ["server-info"],
    queryFn: () => db.getServerInfo(),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success(`Copied: ${label}`);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const info = serverInfo.data;
  const settings = db.getSettings();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Server & Mobile Host Management"
        subtitle="Embedded SQLite host server feeds data directly to mobile devices over Wi-Fi or secure VPN/tunnel"
        action={
          <button
            onClick={() => serverInfo.refetch()}
            className="h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs font-semibold flex items-center gap-1.5 transition text-[#1B2D6B] bg-white hover:bg-[#F1F5F9] shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Network Status
          </button>
        }
      />

      {/* Status banner */}
      <div className="rounded-xl p-5 flex items-center gap-4 bg-white border border-[#E2E8F0] border-l-4 border-l-[#16a34a] shadow-xs">
        <div className="h-11 w-11 rounded-full grid place-items-center bg-emerald-50 shrink-0">
          <Server className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <div className="text-base font-bold text-[#0F172A]">
            Embedded SQLite Host Server: Online & Broadcasting
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            Listening on all network interfaces (0.0.0.0:{settings.server_port || "3000"}) · Direct SQLite read/write
          </div>
        </div>
        <div className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
          ● LIVE
        </div>
      </div>

      {/* Android Mobile APK Download Card */}
      <div className="rounded-xl p-6 bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#1B2D6B]/5 border border-[#1B2D6B]/20 p-1.5 grid place-items-center overflow-hidden shrink-0">
            <img src="/mss-logo.png" alt="MSS Ponkumar Store" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#1B2D6B]">MSS Ponkumar Store — Mobile App (Android APK)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">READY</span>
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Install on any Android smartphone. Connects directly to this desktop over Wi-Fi/VPN with live stock sync &amp; WhatsApp bill dispatch.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <a
            href="/mss-ponkumar-store.apk"
            download="MSS_Ponkumar_Store.apk"
            className="h-10 px-4 rounded-xl bg-[#E8151B] hover:bg-[#c90f14] text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <Download className="h-4 w-4" /> Download APK (6.1 MB)
          </a>
        </div>
      </div>

      {/* Local Wi-Fi Connection URLs */}
      <div className="rounded-xl p-6 space-y-4 bg-white border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-[#1B2D6B]" />
          <div className="text-base font-bold text-[#1B2D6B]">
            Shop Wi-Fi Local Connection URLs
          </div>
        </div>
        <p className="text-xs text-[#64748B]">
          Ensure mobile phones are connected to the same shop Wi-Fi network. Enter any of these URLs in the mobile app:
        </p>

        {info ? (
          <div className="space-y-2">
            {(info.connection_urls || []).map((url: string) => (
              <div
                key={url}
                className="flex items-center gap-3 rounded-lg p-3 bg-[#F8FAFC] border border-[#E2E8F0]"
              >
                <Smartphone className="h-4 w-4 text-[#1B2D6B] shrink-0" />
                <code className="text-xs font-mono flex-1 text-[#0F172A] font-semibold">
                  {url}
                </code>
                <button
                  onClick={() => copyToClipboard(url, url)}
                  className={`h-8 px-3 rounded flex items-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                    copied === url
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[#1B2D6B] hover:bg-[#152352] text-white"
                  }`}
                >
                  {copied === url ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-[#64748B]">
            Detecting local network interfaces...
          </div>
        )}
      </div>

      {/* Remote Access via Tunnel / VPN */}
      <div className="rounded-xl p-6 space-y-4 bg-white border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-[#E8151B]" />
          <div className="text-base font-bold text-[#1B2D6B]">
            Remote Access (Outside the Shop — 100% Free)
          </div>
        </div>
        <p className="text-xs text-[#64748B]">
          Access your shop's database from home or anywhere on mobile without paying for cloud servers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cloudflare Tunnel */}
          <div className="rounded-xl p-5 space-y-2.5 bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#d97706]">
              Option A: Cloudflare Tunnel (Recommended)
            </div>
            <p className="text-xs text-[#64748B]">
              Creates a secure HTTPS public web address pointing to this computer:
            </p>
            <div className="rounded p-3 font-mono text-xs text-[#0F172A] bg-white border border-[#E2E8F0] space-y-1">
              <div>1. Open terminal on this PC</div>
              <div>2. Run: <span className="text-emerald-600 font-bold">cloudflared tunnel --url http://localhost:3000</span></div>
              <div>3. Copy the *.trycloudflare.com URL into mobile app</div>
            </div>
          </div>

          {/* Tailscale */}
          <div className="rounded-xl p-5 space-y-2.5 bg-[#F8FAFC] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#1B2D6B]">
              Option B: Tailscale VPN (Private)
            </div>
            <p className="text-xs text-[#64748B]">
              Private peer-to-peer encrypted mesh between your desktop and mobile:
            </p>
            <div className="rounded p-3 font-mono text-xs text-[#0F172A] bg-white border border-[#E2E8F0] space-y-1">
              <div>1. Install Tailscale app on PC & Phone</div>
              <div>2. Sign in with the same email</div>
              <div>3. Use PC's 100.x.y.z Tailscale IP on phone</div>
            </div>
          </div>
        </div>

        {settings.custom_tunnel_url && (
          <div className="rounded-lg p-3.5 flex items-center gap-3 bg-emerald-50 border border-emerald-200">
            <Shield className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-[#0F172A]">
                Saved Custom Tunnel URL
              </div>
              <div className="text-xs font-mono text-emerald-700 font-semibold">
                {settings.custom_tunnel_url}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(settings.custom_tunnel_url!, "Tunnel URL")}
              className="ml-auto h-8 px-3 rounded bg-white border border-emerald-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="rounded-xl p-6 space-y-3 bg-white border border-[#E2E8F0] shadow-xs">
        <div className="text-base font-bold text-[#1B2D6B]">Mobile API Authentication Key</div>
        <p className="text-xs text-[#64748B]">
          Pass this security key in the mobile app header <code className="text-emerald-600 font-bold">X-API-Key</code>:
        </p>
        <div className="flex items-center gap-2 rounded-lg p-3 bg-[#F8FAFC] border border-[#E2E8F0]">
          <code className="text-xs font-mono flex-1 text-[#0F172A] font-bold">
            {settings.api_key || "mssp_secret_key_88"}
          </code>
          <button
            onClick={() => copyToClipboard(settings.api_key || "mssp_secret_key_88", "API Key")}
            className="h-8 px-3 rounded flex items-center gap-1.5 text-xs font-bold bg-[#1B2D6B] hover:bg-[#152352] text-white transition cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Key
          </button>
        </div>
      </div>
    </div>
  );
}
