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
  Network,
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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Server & Mobile Host Management"
        subtitle="Embedded SQLite host server feeds data directly to mobile devices over Wi-Fi or secure VPN/tunnel"
        action={
          <button
            onClick={() => serverInfo.refetch()}
            className="h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition text-white"
            style={{ background: "#1A2755", borderColor: "#243068" }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Network Status
          </button>
        }
      />

      {/* Status banner */}
      <div
        className="rounded-xl p-4 flex items-center gap-4"
        style={{
          background: "#162044",
          border: "1px solid #243068",
          borderLeft: "4px solid #22c55e",
        }}
      >
        <div
          className="h-10 w-10 rounded-full grid place-items-center"
          style={{ background: "#22c55e22" }}
        >
          <Server className="h-5 w-5" style={{ color: "#22c55e" }} />
        </div>
        <div>
          <div className="text-sm font-bold text-white">
            Embedded SQLite Host Server: Online & Broadcasting
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#8B9CC5" }}>
            Listening on all network interfaces (0.0.0.0:{settings.server_port || "3000"}) · Direct SQLite read/write
          </div>
        </div>
        <div
          className="ml-auto px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: "#22c55e22", color: "#22c55e" }}
        >
          ● LIVE
        </div>
      </div>

      {/* Local Wi-Fi Connection URLs */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "#162044", border: "1px solid #243068" }}
      >
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4" style={{ color: "#1B2D6B" }} />
          <div className="text-sm font-bold text-white">
            Shop Wi-Fi Local Connection URLs
          </div>
        </div>
        <p className="text-xs" style={{ color: "#8B9CC5" }}>
          Ensure mobile phones are connected to the same shop Wi-Fi network. Enter any of these URLs in the mobile app:
        </p>

        {info ? (
          <div className="space-y-2">
            {(info.connection_urls || []).map((url: string) => (
              <div
                key={url}
                className="flex items-center gap-2 rounded-lg p-3"
                style={{ background: "#1A2755", border: "1px solid #243068" }}
              >
                <Smartphone className="h-4 w-4 text-primary shrink-0" />
                <code className="text-xs font-mono flex-1 text-white">
                  {url}
                </code>
                <button
                  onClick={() => copyToClipboard(url, url)}
                  className="h-7 px-2.5 rounded flex items-center gap-1 text-xs font-bold transition"
                  style={{
                    background: copied === url ? "#22c55e22" : "#243068",
                    color: copied === url ? "#22c55e" : "#8B9CC5",
                  }}
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
          <div className="text-xs" style={{ color: "#8B9CC5" }}>
            Detecting local network interfaces...
          </div>
        )}
      </div>

      {/* Remote Access via Tunnel / VPN */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "#162044", border: "1px solid #243068" }}
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" style={{ color: "#E8151B" }} />
          <div className="text-sm font-bold text-white">
            Remote Access (Outside the Shop — 100% Free)
          </div>
        </div>
        <p className="text-xs" style={{ color: "#8B9CC5" }}>
          Access your shop's database from home or anywhere on mobile without paying for cloud servers:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cloudflare Tunnel */}
          <div
            className="rounded-lg p-4 space-y-2.5"
            style={{ background: "#1A2755", border: "1px solid #243068" }}
          >
            <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>
              Option A: Cloudflare Tunnel (Recommended)
            </div>
            <p className="text-xs" style={{ color: "#8B9CC5" }}>
              Creates a secure HTTPS public web address pointing to this computer:
            </p>
            <div
              className="rounded p-2.5 font-mono text-xs text-white space-y-1"
              style={{ background: "#0F1A3E" }}
            >
              <div>1. Open terminal on this PC</div>
              <div>2. Run: <span className="text-emerald-400">cloudflared tunnel --url http://localhost:3000</span></div>
              <div>3. Copy the *.trycloudflare.com URL into mobile app</div>
            </div>
          </div>

          {/* Tailscale */}
          <div
            className="rounded-lg p-4 space-y-2.5"
            style={{ background: "#1A2755", border: "1px solid #243068" }}
          >
            <div className="text-sm font-bold" style={{ color: "#1B2D6B" }}>
              Option B: Tailscale VPN (Private)
            </div>
            <p className="text-xs" style={{ color: "#8B9CC5" }}>
              Private peer-to-peer encrypted mesh between your desktop and mobile:
            </p>
            <div
              className="rounded p-2.5 font-mono text-xs text-white space-y-1"
              style={{ background: "#0F1A3E" }}
            >
              <div>1. Install Tailscale app on PC & Phone</div>
              <div>2. Sign in with the same email</div>
              <div>3. Use PC's 100.x.y.z Tailscale IP on phone</div>
            </div>
          </div>
        </div>

        {settings.custom_tunnel_url && (
          <div
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ background: "#1A2755", border: "1px solid #22c55e55" }}
          >
            <Shield className="h-4 w-4" style={{ color: "#22c55e" }} />
            <div>
              <div className="text-xs font-bold text-white">
                Saved Custom Tunnel URL
              </div>
              <div className="text-xs font-mono" style={{ color: "#22c55e" }}>
                {settings.custom_tunnel_url}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(settings.custom_tunnel_url!, "Tunnel URL")}
              className="ml-auto h-7 px-2 rounded grid place-items-center text-xs"
              style={{ background: "#243068", color: "#8B9CC5" }}
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* API Key */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: "#162044", border: "1px solid #243068" }}
      >
        <div className="text-sm font-bold text-white">Mobile API Authentication Key</div>
        <p className="text-xs" style={{ color: "#8B9CC5" }}>
          Pass this security key in the mobile app header <code className="text-emerald-400">X-API-Key</code>:
        </p>
        <div
          className="flex items-center gap-2 rounded-lg p-3"
          style={{ background: "#1A2755", border: "1px solid #243068" }}
        >
          <code className="text-xs font-mono flex-1 text-white">
            {settings.api_key || "mssp_secret_key_88"}
          </code>
          <button
            onClick={() => copyToClipboard(settings.api_key || "mssp_secret_key_88", "API Key")}
            className="h-7 px-2.5 rounded flex items-center gap-1 text-xs font-bold transition"
            style={{ background: "#243068", color: "#8B9CC5" }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy Key
          </button>
        </div>
      </div>
    </div>
  );
}

