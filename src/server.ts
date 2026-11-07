import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// Helper: standard JSON response with full CORS support for mobile devices
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

// Helper: gather all network IP addresses of this host machine
async function getNetworkIPs(): Promise<string[]> {
  try {
    const os = await import("os");
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const netArr = interfaces[name];
      if (!netArr) continue;
      for (const net of netArr) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === "IPv4" && !net.internal) {
          ips.push(net.address);
        }
      }
    }
    return ips;
  } catch {
    return [];
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // 1. Preflight CORS handling for all /api requests
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 2. Health & Status Check
    if (url.pathname === "/api/health" || url.pathname === "/api/status") {
      return jsonResponse({
        status: "online",
        service: "BillDesk-VPN Offline Server",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Server Info (Returns host IPs, port, status for Mobile Pairing QR & UI)
    if (url.pathname === "/api/server-info") {
      const ips = await getNetworkIPs();
      const port = process.env.PORT || "3000";
      return jsonResponse({
        status: "online",
        name: "BillDesk-VPN Desktop Host",
        port: Number(port),
        local_ips: ips,
        connection_urls: ips.map((ip) => `http://${ip}:${port}`),
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Live Mobile Dashboard Summary Stats
    if (url.pathname === "/api/dashboard/stats") {
      try {
        const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
        const db = SQLiteDatabaseManager.getDB();
        await SQLiteDatabaseManager.initializeSchema();

        const todayPrefix = new Date().toISOString().slice(0, 10);

        // Today sales sum & count
        const todayStats = await db.get(
          `SELECT COUNT(*) as count, COALESCE(SUM(grand_total), 0) as total_sales, COALESCE(SUM(balance_due), 0) as today_credit 
           FROM invoices WHERE created_at LIKE ?`,
          [`${todayPrefix}%`]
        );

        // Total receivables across all customers
        const receivables = await db.get(
          `SELECT COALESCE(SUM(balance_due), 0) as total_due FROM customers WHERE balance_due > 0`
        );

        // Low stock items count
        const lowStock = await db.get(
          `SELECT COUNT(*) as count FROM inventory WHERE stock_qty <= min_stock_alert`
        );

        // Total active products count
        const totalProducts = await db.get(`SELECT COUNT(*) as count FROM inventory`);

        return jsonResponse({
          today: {
            date: todayPrefix,
            invoices_count: todayStats?.count || 0,
            total_sales: Number(todayStats?.total_sales || 0),
            credit_issued: Number(todayStats?.today_credit || 0),
          },
          receivables_total: Number(receivables?.total_due || 0),
          inventory: {
            total_products: totalProducts?.count || 0,
            low_stock_alerts: lowStock?.count || 0,
          },
        });
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to fetch stats" }, 500);
      }
    }

    // 5. REST: Inventory
    if (url.pathname === "/api/inventory") {
      try {
        const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
        const db = SQLiteDatabaseManager.getDB();
        await SQLiteDatabaseManager.initializeSchema();

        if (request.method === "GET") {
          const q = url.searchParams.get("q")?.trim();
          const barcode = url.searchParams.get("barcode")?.trim();

          let items: any[] = [];
          if (barcode) {
            items = await db.all(`SELECT * FROM inventory WHERE barcode = ? OR sku_code = ? LIMIT 1`, [barcode, barcode]);
            return jsonResponse(items[0] || null);
          } else if (q) {
            items = await db.all(
              `SELECT * FROM inventory WHERE name LIKE ? OR barcode LIKE ? OR category LIKE ? ORDER BY name ASC LIMIT 100`,
              [`%${q}%`, `%${q}%`, `%${q}%`]
            );
          } else {
            items = await db.all(`SELECT * FROM inventory ORDER BY name ASC`);
          }
          return jsonResponse({ items });
        } else if (request.method === "POST") {
          const item = await request.json();
          await SQLiteDatabaseManager.upsertRow("inventory", item);
          return jsonResponse({ success: true, item });
        }
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // 6. REST: Customers & Khata Ledger Balances
    if (url.pathname === "/api/customers") {
      try {
        const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
        const db = SQLiteDatabaseManager.getDB();
        await SQLiteDatabaseManager.initializeSchema();

        if (request.method === "GET") {
          const q = url.searchParams.get("q")?.trim();
          let customers: any[] = [];
          if (q) {
            customers = await db.all(
              `SELECT * FROM customers WHERE name LIKE ? OR mobile LIKE ? ORDER BY name ASC LIMIT 50`,
              [`%${q}%`, `%${q}%`]
            );
          } else {
            customers = await db.all(`SELECT * FROM customers ORDER BY name ASC`);
          }
          return jsonResponse({ customers });
        } else if (request.method === "POST") {
          const customer = await request.json();
          await SQLiteDatabaseManager.upsertRow("customers", customer);
          return jsonResponse({ success: true, customer });
        }
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // 7. REST: Invoices
    if (url.pathname === "/api/invoices") {
      try {
        const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
        const db = SQLiteDatabaseManager.getDB();
        await SQLiteDatabaseManager.initializeSchema();

        if (request.method === "GET") {
          const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
          const invoices = await db.all(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT ?`, [limit]);

          if (invoices.length > 0) {
            const invoiceIds = invoices.map((inv) => `'${inv.id}'`).join(",");
            const items = await db.all(`SELECT * FROM invoice_items WHERE invoice_id IN (${invoiceIds})`);
            const itemsByInv: Record<string, any[]> = {};
            items.forEach((it) => {
              if (!itemsByInv[it.invoice_id]) itemsByInv[it.invoice_id] = [];
              itemsByInv[it.invoice_id].push(it);
            });
            invoices.forEach((inv) => {
              inv.items = itemsByInv[inv.id] || [];
            });
          }
          return jsonResponse({ invoices });
        } else if (request.method === "POST") {
          const body = await request.json();
          const { invoice, items = [] } = body;

          if (!invoice || !invoice.id) {
            return jsonResponse({ error: "Invalid invoice object" }, 400);
          }

          await SQLiteDatabaseManager.upsertRow("invoices", invoice);
          await db.run("DELETE FROM invoice_items WHERE invoice_id = ?", [invoice.id]);

          for (const item of items) {
            await SQLiteDatabaseManager.upsertRow("invoice_items", {
              ...item,
              invoice_id: invoice.id,
            });

            // Auto deduct stock if product_id is matched (allows negative inventory)
            if (item.product_id) {
              await db.run(
                `UPDATE inventory SET stock_qty = stock_qty - ? WHERE id = ?`,
                [Number(item.qty || 1), item.product_id]
              );
            }
          }

          // If credit sale or balance due, update customer balance and ledger
          if (invoice.customer_id && Number(invoice.balance_due || 0) > 0) {
            await db.run(
              `UPDATE customers SET balance_due = COALESCE(balance_due, 0) + ? WHERE id = ?`,
              [Number(invoice.balance_due), invoice.customer_id]
            );

            // Record in ledger
            const ledgerId = `ledg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            await SQLiteDatabaseManager.upsertRow("ledger", {
              id: ledgerId,
              customer_id: invoice.customer_id,
              customer_name: invoice.customer_name || "Customer",
              customer_mobile: invoice.customer_mobile || "",
              date: invoice.created_at || new Date().toISOString(),
              type: "DEBIT",
              amount: Number(invoice.balance_due),
              balance_after: 0,
              reference_type: "INVOICE",
              reference_id: invoice.invoice_number || invoice.id,
              payment_mode: invoice.payment_method || "CREDIT",
              notes: `Credit invoice #${invoice.invoice_number || invoice.id}`,
              created_at: new Date().toISOString(),
            });
          }

          return jsonResponse({ success: true, invoice_id: invoice.id });
        }
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // 8. REST: Ledger & Khata Payments
    if (url.pathname === "/api/ledger") {
      try {
        const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
        const db = SQLiteDatabaseManager.getDB();
        await SQLiteDatabaseManager.initializeSchema();

        if (request.method === "GET") {
          const customerId = url.searchParams.get("customer_id");
          let entries: any[] = [];
          if (customerId) {
            entries = await db.all(
              `SELECT * FROM ledger WHERE customer_id = ? ORDER BY date DESC, created_at DESC`,
              [customerId]
            );
          } else {
            entries = await db.all(`SELECT * FROM ledger ORDER BY date DESC, created_at DESC LIMIT 200`);
          }
          return jsonResponse({ ledger: entries });
        } else if (request.method === "POST") {
          const entry = await request.json();
          await SQLiteDatabaseManager.upsertRow("ledger", entry);

          // Update customer outstanding balance
          if (entry.customer_id && entry.amount) {
            const delta = entry.type === "CREDIT" ? -Number(entry.amount) : Number(entry.amount);
            await db.run(
              `UPDATE customers SET balance_due = MAX(0, COALESCE(balance_due, 0) + ?) WHERE id = ?`,
              [delta, entry.customer_id]
            );
          }
          return jsonResponse({ success: true, entry });
        }
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // 9. Full Store API /api/db (for Desktop React UI state synchronization)
    if (url.pathname === "/api/db") {
      if (request.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0, must-revalidate",
          },
        });
      }
      if (request.method === "GET") {
        try {
          const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");
          const store = await SQLiteDatabaseManager.loadFullStore();
          return jsonResponse(store);
        } catch (err: any) {
          console.error("[API GET /api/db] Error loading database:", err);
          return jsonResponse({ error: err.message || "Fetch failed" }, 500);
        }
      } else if (request.method === "POST") {
        try {
          const body = await request.json();
          const { action, table, data, id } = body;
          const { SQLiteDatabaseManager } = await import("./lib/db/sqlite-server-db");

          if (action === "upsert") {
            await SQLiteDatabaseManager.upsertRow(table, data);
          } else if (action === "bulk_seed") {
            const { store } = body;
            await SQLiteDatabaseManager.bulkSeedStore(store);
          } else if (action === "upsert_invoice") {
            const { invoice, items } = body;
            await SQLiteDatabaseManager.upsertRow("invoices", invoice);
            const dbConn = SQLiteDatabaseManager.getDB();
            await dbConn.run("DELETE FROM invoice_items WHERE invoice_id = ? OR invoice_id = ?", [
              invoice.id,
              invoice.invoice_number,
            ]);
            for (const item of items) {
              await SQLiteDatabaseManager.upsertRow("invoice_items", item);
            }
          } else if (action === "delete") {
            await SQLiteDatabaseManager.deleteRow(table, id);
          } else if (action === "reset") {
            await SQLiteDatabaseManager.clearAllTables();
          } else if (action === "clear_transactions") {
            await SQLiteDatabaseManager.clearTransactionsOnly();
          } else if (action === "factory_reset") {
            const { options } = body;
            await SQLiteDatabaseManager.factoryResetStore(options);
          }

          return jsonResponse({ success: true });
        } catch (err: any) {
          console.error("[API POST /api/db] Error executing action:", err);
          return jsonResponse({ error: err.message || "Action failed" }, 500);
        }
      }
    }

    // 10. /api/printers — returns list of real installed printers from the OS
    if (url.pathname === "/api/printers") {
      if (request.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      if (request.method === "GET") {
        try {
          const { execSync } = (await import("child_process")) as any;
          let printers: string[] = [];

          try {
            // Windows: use PowerShell to get printer names
            const raw = execSync(
              'powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"',
              { timeout: 5000, encoding: "utf8" }
            ) as string;
            printers = raw
              .split(/\r?\n/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
          } catch {
            // Fallback: try wmic
            try {
              const raw = execSync("wmic printer get name /format:list", {
                timeout: 5000,
                encoding: "utf8",
              }) as string;
              printers = raw
                .split(/\r?\n/)
                .map((s: string) => s.replace(/^Name=/, "").trim())
                .filter((s: string) => s.length > 0 && !s.includes("="));
            } catch {
              printers = [];
            }
          }

          return jsonResponse({ printers });
        } catch (err: any) {
          return jsonResponse({ printers: [], error: err.message });
        }
      }
    }

    // Default route: TanStack Start SSR & Client Handler
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
