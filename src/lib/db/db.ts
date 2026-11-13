/**
 * ============================================================================
 * BILLDESK-VPN — LOCAL SQLITE DATABASE ENGINE & EMBEDDED SERVER STORE
 * ============================================================================
 * 
 * 100% Offline-capable, zero external cloud dependency.
 * Stores data locally in SQLite on the desktop machine.
 * The desktop machine acts as a local host server, feeding live data to
 * mobile apps via Wi-Fi or VPN/tunneling (Tailscale / Cloudflare Tunnel).
 */

export interface User {
  id: string;
  username: string;
  pin: string;
  role: 'Admin' | 'Cashier';
  created_at: string;
}

export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  mrp?: number;
  wholesale_price?: number;
  stock_qty: number;
  godown_qty?: number;
  moq?: number;
  min_stock_alert: number;
  sku_code?: string;
  gst_rate: number;
  image_path?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gst_number: string;
  balance_due: number; // Outstanding amount to pay (Khata due)
  loyalty_points: number;
  total_spent: number;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  barcode?: string;
  product_name: string;
  qty: number;
  unit?: string;
  unit_price: number;
  mrp?: number;
  gst_rate?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_price: number;
  total?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name: string;
  customer_mobile: string;
  customer_address?: string;
  customer_gstin?: string;
  invoice_type: 'GST' | 'NON_GST' | 'MIXED';
  bill_mode?: 'RETAIL' | 'WHOLESALE';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  exchange_amount?: number;
  exchange_notes?: string;
  round_off?: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT';
  payment_status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'PENDING';
  items: InvoiceItem[];
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_mobile?: string;
  date: string;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = sale on credit / invoice due; CREDIT = payment received
  amount: number;
  balance_after: number;
  reference_type: 'INVOICE' | 'PAYMENT' | 'OPENING' | 'ADJUSTMENT' | 'INVOICE_SETTLEMENT';
  reference_id: string;
  payment_mode?: 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE' | 'CREDIT' | 'SPLIT';
  notes?: string;
  created_at: string;
}

export interface BackupLog {
  id: string;
  filename: string;
  type: string;
  size_kb: number;
  timestamp: string;
  status: string;
}

export interface Settings {
  shop_name: string;
  legal_name?: string;
  phone: string;
  shop_phone?: string;
  email?: string;
  gstin: string;
  shop_gstin?: string;
  upi_id: string;
  address_line1: string;
  shop_address?: string;
  address_line2?: string;
  city_pincode: string;
  invoice_prefix: string;
  receipt_header_note?: string;
  receipt_footer_note?: string;
  receipt_footer_message?: string;
  shop_logo?: string;
  show_logo?: boolean;
  terms_line1?: string;
  terms_line2?: string;
  currency_symbol?: string;
  api_key?: string;
  server_port?: string;
  custom_tunnel_url?: string;
  [key: string]: any;
}

export interface ServerInfo {
  status: string;
  name: string;
  port: number;
  local_ips: string[];
  connection_urls: string[];
  timestamp: string;
}

export interface DBStore {
  users: User[];
  inventory: InventoryItem[];
  customers: Customer[];
  invoices: Invoice[];
  invoice_items: InvoiceItem[];
  ledger: LedgerEntry[];
  settings: Settings;
  vendors: any[];
  purchase_orders: any[];
  purchase_items: any[];
  service_tickets: any[];
  scrap_entries: any[];
  godown_transfers: any[];
  backups_log: BackupLog[];
  loyalty_ledger: any[];
}

const LOCAL_STORAGE_KEY = 'mssp_store_v1';
const LEGACY_STORAGE_KEY = 'billdesk_vpn_store_v1';

const DEFAULT_SETTINGS: Settings = {
  shop_name: 'MSS Ponkumar Store',
  legal_name: 'MSS Ponkumar Store - Wholesale Shop',
  phone: '9876543210',
  shop_phone: '9876543210',
  email: 'admin@msspk.local',
  gstin: '',
  shop_gstin: '',
  upi_id: '',
  address_line1: 'MSS Ponkumar Store',
  shop_address: 'MSS Ponkumar Store',
  address_line2: '',
  city_pincode: 'Your City - PIN',
  invoice_prefix: 'MSSP-',
  receipt_header_note: 'WHOLESALE SHOP',
  receipt_footer_note: '*** Thank You For Your Business! ***\nGoods once sold can be exchanged within 7 days with valid bill.\nPlease retain this bill for warranty & service reference.\nMSS PONKUMAR STORE • WHOLESALE SHOP',
  receipt_footer_message: '*** Thank You For Your Business! ***\nGoods once sold can be exchanged within 7 days with valid bill.\nPlease retain this bill for warranty & service reference.\nMSS PONKUMAR STORE • WHOLESALE SHOP',
  shop_logo: '/mss-logo.png',
  show_logo: true,
  terms_line1: '1. Goods once sold can be exchanged with valid bill within 7 days.',
  terms_line2: '2. All disputes subject to local jurisdiction.',
  currency_symbol: '₹',
  api_key: 'mssp_secret_key_88',
  server_port: '3000',
  custom_tunnel_url: '',
  low_stock_threshold: '10',
};

const DEFAULT_STORE: DBStore = {
  users: [
    {
      id: 'usr-1',
      username: 'admin',
      pin: '1234',
      role: 'Admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-2',
      username: 'cashier',
      pin: '0000',
      role: 'Cashier',
      created_at: new Date().toISOString(),
    },
  ],
  inventory: [
    {
      id: 'inv-1',
      barcode: 'MSSP8901001',
      name: 'Stainless Steel Flask 1000ml',
      category: 'Utensils',
      unit: 'Pcs',
      cost_price: 350,
      selling_price: 550,
      mrp: 650,
      wholesale_price: 450,
      stock_qty: 45,
      min_stock_alert: 5,
      gst_rate: 18,
      sku_code: 'FLASK-1L',
      created_at: new Date().toISOString(),
    },
    {
      id: 'inv-2',
      barcode: 'MSSP8901002',
      name: 'Hard Anodised Cooker 5L',
      category: 'Cookware',
      unit: 'Pcs',
      cost_price: 1200,
      selling_price: 1750,
      mrp: 1999,
      wholesale_price: 1400,
      stock_qty: 20,
      min_stock_alert: 3,
      gst_rate: 12,
      sku_code: 'COOKER-5L',
      created_at: new Date().toISOString(),
    },
    {
      id: 'inv-3',
      barcode: 'MSSP8901003',
      name: 'Electric Mixer Grinder 750W',
      category: 'Appliances',
      unit: 'Pcs',
      cost_price: 1850,
      selling_price: 2600,
      mrp: 2999,
      wholesale_price: 2100,
      stock_qty: 12,
      min_stock_alert: 2,
      gst_rate: 18,
      sku_code: 'MIXER-750',
      created_at: new Date().toISOString(),
    },
  ],
  customers: [
    {
      id: 'cust-1',
      name: 'Ramesh Kumar',
      mobile: '9840123456',
      email: 'ramesh@example.com',
      address: '14, North Car Street',
      gst_number: '',
      balance_due: 1500,
      loyalty_points: 150,
      total_spent: 8500,
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      name: 'Priya Sundar',
      mobile: '9840987654',
      email: 'priya@example.com',
      address: '77, Bazaar Street',
      gst_number: '',
      balance_due: 0,
      loyalty_points: 240,
      total_spent: 12400,
      created_at: new Date().toISOString(),
    },
  ],
  invoices: [],
  invoice_items: [],
  ledger: [
    {
      id: 'ledg-1',
      customer_id: 'cust-1',
      customer_name: 'Ramesh Kumar',
      customer_mobile: '9840123456',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: 'DEBIT',
      amount: 2500,
      balance_after: 2500,
      reference_type: 'INVOICE',
      reference_id: 'BD-1001',
      payment_mode: 'CREDIT',
      notes: 'Credit sale invoice #BD-1001',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'ledg-2',
      customer_id: 'cust-1',
      customer_name: 'Ramesh Kumar',
      customer_mobile: '9840123456',
      date: new Date(Date.now() - 86400000).toISOString(),
      type: 'CREDIT',
      amount: 1000,
      balance_after: 1500,
      reference_type: 'PAYMENT',
      reference_id: 'PAY-1001',
      payment_mode: 'UPI',
      notes: 'Partial payment received via UPI',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  settings: DEFAULT_SETTINGS,
  vendors: [],
  purchase_orders: [],
  purchase_items: [],
  service_tickets: [],
  scrap_entries: [],
  godown_transfers: [],
  backups_log: [],
  loyalty_ledger: [],
};

class BillDeskDB {
  private store: DBStore = { ...DEFAULT_STORE };
  public isLoaded: boolean = false;
  public loadPromise: Promise<void>;

  constructor() {
    this.loadPromise = this.init();
  }

  private async init() {
    // 1. Instantly load from localStorage for zero initial load delay
    if (typeof window !== 'undefined') {
      try {
        let cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!cached) {
          cached = localStorage.getItem(LEGACY_STORAGE_KEY);
        }
        if (cached) {
          const parsed = JSON.parse(cached);
          this.store = {
            ...DEFAULT_STORE,
            ...parsed,
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          };
        }
      } catch (err) {
        console.warn('[BillDesk DB] LocalStorage parse warning:', err);
      }
    }

    // Always enforce MSS Ponkumar Store branding
    if (
      !this.store.settings.shop_name ||
      this.store.settings.shop_name.includes("Ponmani") ||
      this.store.settings.shop_name.includes("BillDesk") ||
      this.store.settings.shop_name.includes("Kairos")
    ) {
      this.store.settings.shop_name = 'MSS Ponkumar Store';
      this.store.settings.legal_name = 'MSS Ponkumar Store - Wholesale Shop';
      this.persistLocal();
    }

    // 2. Fetch ground-truth state from the local SQLite API server
    await this.fetchFromServer();

    this.isLoaded = true;
  }

  private persistLocal() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.store));
      } catch (err) {
        console.warn('[BillDesk DB] LocalStorage write error:', err);
      }
    }
  }

  /**
   * Dispatch background write operation to the local SQLite database API
   */
  private async syncToServer(action: string, payload: any = {}): Promise<any> {
    if (typeof window === 'undefined') return null;

    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      return await response.json();
    } catch (err) {
      console.warn(`[BillDesk DB Sync Error] Action ${action}:`, err);
      return null;
    }
  }

  /**
   * Hydrate local store with ground-truth records from local SQLite
   */
  public async fetchFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data && typeof data === 'object') {
        if (Array.isArray(data.inventory)) this.store.inventory = data.inventory;
        if (Array.isArray(data.customers)) this.store.customers = data.customers;
        if (Array.isArray(data.ledger)) this.store.ledger = data.ledger;
        if (Array.isArray(data.users) && data.users.length > 0) this.store.users = data.users;

        if (Array.isArray(data.invoices)) {
          const itemsByInv: Record<string, InvoiceItem[]> = {};
          if (Array.isArray(data.invoice_items)) {
            data.invoice_items.forEach((it: InvoiceItem) => {
              if (!itemsByInv[it.invoice_id]) itemsByInv[it.invoice_id] = [];
              itemsByInv[it.invoice_id].push(it);
            });
            this.store.invoice_items = data.invoice_items;
          }
          this.store.invoices = data.invoices.map((inv: Invoice) => ({
            ...inv,
            items: itemsByInv[inv.id] || inv.items || [],
          }));
        }

        if (data.settings && typeof data.settings === 'object') {
          this.store.settings = { ...this.store.settings, ...data.settings };
        }

        if (
          !this.store.settings.shop_name ||
          this.store.settings.shop_name.includes("Ponmani") ||
          this.store.settings.shop_name.includes("BillDesk") ||
          this.store.settings.shop_name.includes("Kairos")
        ) {
          this.store.settings.shop_name = 'MSS Ponkumar Store';
          this.store.settings.legal_name = 'MSS Ponkumar Store - Wholesale Shop';
        }

        this.reconcileCustomersAndInvoices();
        this.persistLocal();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[BillDesk DB] SQLite server sync:', err);
      return false;
    }
  }

  /**
   * Query network details and server host status for mobile connection pairing
   */
  public async getServerInfo(): Promise<ServerInfo | null> {
    if (typeof window === 'undefined') return null;
    try {
      const res = await fetch('/api/server-info');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ==========================================
  // INVENTORY METHODS
  // ==========================================

  public getInventory(): InventoryItem[] {
    return [...this.store.inventory];
  }

  public getProductByBarcode(code: string): InventoryItem | undefined {
    const query = code.trim().toLowerCase();
    return this.store.inventory.find(
      (p) => p.barcode?.toLowerCase() === query || p.sku_code?.toLowerCase() === query
    );
  }

  public getProductById(id: string): InventoryItem | undefined {
    return this.store.inventory.find((p) => p.id === id);
  }

  public saveInventoryItem(item: Partial<InventoryItem>): InventoryItem {
    const existingIndex = this.store.inventory.findIndex((p) => p.id === item.id);
    const now = new Date().toISOString();

    let savedItem: InventoryItem;
    if (existingIndex >= 0) {
      savedItem = {
        ...this.store.inventory[existingIndex],
        ...item,
        cost_price: Number(item.cost_price ?? this.store.inventory[existingIndex].cost_price ?? 0),
        selling_price: Number(item.selling_price ?? this.store.inventory[existingIndex].selling_price ?? 0),
        mrp: Number(item.mrp ?? this.store.inventory[existingIndex].mrp ?? 0),
        stock_qty: Number(item.stock_qty ?? this.store.inventory[existingIndex].stock_qty ?? 0),
        min_stock_alert: Number(item.min_stock_alert ?? this.store.inventory[existingIndex].min_stock_alert ?? 0),
        gst_rate: Number(item.gst_rate ?? this.store.inventory[existingIndex].gst_rate ?? 0),
        wholesale_price: Number(item.wholesale_price ?? this.store.inventory[existingIndex].wholesale_price ?? 0),
      };
      this.store.inventory[existingIndex] = savedItem;
    } else {
      savedItem = {
        id: item.id || `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        barcode: item.barcode || `MSSP${Date.now().toString().slice(-7)}`,
        name: item.name || 'Untitled Item',
        category: item.category || 'General',
        unit: item.unit || 'Pcs',
        cost_price: Number(item.cost_price || 0),
        selling_price: Number(item.selling_price || 0),
        mrp: Number(item.mrp || 0),
        stock_qty: Number(item.stock_qty || 0),
        min_stock_alert: Number(item.min_stock_alert || 0),
        gst_rate: Number(item.gst_rate || 0),
        wholesale_price: Number(item.wholesale_price || 0),
        sku_code: item.sku_code || '',
        created_at: now,
      };
      this.store.inventory.unshift(savedItem);
    }

    this.persistLocal();
    this.syncToServer('upsert', { table: 'inventory', data: savedItem });
    return savedItem;
  }

  public deleteInventoryItem(id: string): boolean {
    this.store.inventory = this.store.inventory.filter((p) => p.id !== id);
    this.persistLocal();
    this.syncToServer('delete', { table: 'inventory', id });
    return true;
  }

  public bulkImportInventory(items: Partial<InventoryItem>[]): { count: number; success: boolean; errors: any[] } {
    let importedCount = 0;
    const errors: any[] = [];
    items.forEach((item) => {
      try {
        if (item.name) {
          this.saveInventoryItem(item);
          importedCount++;
        }
      } catch (e: any) {
        errors.push({ item, error: e.message });
      }
    });
    this.persistLocal();
    return { count: importedCount, success: errors.length === 0, errors };
  }

  // ==========================================
  // CUSTOMER METHODS & KHATA BALANCE
  // ==========================================

  public getCustomers(): Customer[] {
    return [...this.store.customers];
  }

  public getCustomer(id: string): Customer | undefined {
    return this.store.customers.find((c) => c.id === id);
  }

  public getCustomerByMobile(mobile: string): Customer | undefined {
    const clean = mobile.replace(/\D/g, '');
    if (!clean) return undefined;
    return this.store.customers.find((c) => c.mobile.replace(/\D/g, '') === clean);
  }

  public saveCustomer(cust: Partial<Customer>): Customer {
    const existingIndex = this.store.customers.findIndex((c) => c.id === cust.id);
    const now = new Date().toISOString();

    let saved: Customer;
    if (existingIndex >= 0) {
      saved = {
        ...this.store.customers[existingIndex],
        ...cust,
        balance_due: Number(cust.balance_due ?? this.store.customers[existingIndex].balance_due ?? 0),
        loyalty_points: Number(cust.loyalty_points ?? this.store.customers[existingIndex].loyalty_points ?? 0),
        total_spent: Number(cust.total_spent ?? this.store.customers[existingIndex].total_spent ?? 0),
      };
      this.store.customers[existingIndex] = saved;
    } else {
      saved = {
        id: cust.id || `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: cust.name || 'Valued Customer',
        mobile: cust.mobile || '',
        email: cust.email || '',
        address: cust.address || '',
        gst_number: cust.gst_number || '',
        balance_due: Number(cust.balance_due || 0),
        loyalty_points: Number(cust.loyalty_points || 0),
        total_spent: Number(cust.total_spent || 0),
        created_at: now,
      };
      this.store.customers.unshift(saved);
    }

    this.persistLocal();
    this.syncToServer('upsert', { table: 'customers', data: saved });
    return saved;
  }

  public deleteCustomer(id: string): boolean {
    this.store.customers = this.store.customers.filter((c) => c.id !== id);
    this.persistLocal();
    this.syncToServer('delete', { table: 'customers', id });
    return true;
  }

  public getCustomerInvoices(customerId: string, fallbackName?: string, fallbackMobile?: string): Invoice[] {
    const cust = customerId ? this.getCustomer(customerId) : undefined;
    const cleanName = (cust?.name || fallbackName)?.trim().toLowerCase();
    const rawMobile = (cust?.mobile || fallbackMobile)?.trim() || '';
    const cleanMobile = rawMobile.replace(/\D/g, '');

    return this.getInvoices().filter((inv) => {
      if (customerId && inv.customer_id === customerId) return true;
      if (cleanMobile && cleanMobile.length >= 7 && inv.customer_mobile && inv.customer_mobile.replace(/\D/g, '').includes(cleanMobile)) {
        return true;
      }
      if (cleanName && cleanName !== 'walk-in customer' && inv.customer_name && inv.customer_name.trim().toLowerCase() === cleanName) {
        return true;
      }
      return false;
    }).map((inv) => {
      if (!inv.items || inv.items.length === 0) {
        const lineItems = this.store.invoice_items.filter((it) => it.invoice_id === inv.id || it.invoice_id === inv.invoice_number);
        return { ...inv, items: lineItems };
      }
      return inv;
    });
  }

  public getCustomerLedger(customerId: string, fallbackName?: string, fallbackMobile?: string): LedgerEntry[] {
    const cust = customerId ? this.getCustomer(customerId) : undefined;
    const cleanName = (cust?.name || fallbackName)?.trim().toLowerCase();
    const rawMobile = (cust?.mobile || fallbackMobile)?.trim() || '';
    const cleanMobile = rawMobile.replace(/\D/g, '');

    return this.store.ledger
      .filter((l) => {
        if (customerId && l.customer_id === customerId) return true;
        if (cleanMobile && cleanMobile.length >= 7 && l.customer_mobile && l.customer_mobile.replace(/\D/g, '').includes(cleanMobile)) {
          return true;
        }
        if (cleanName && cleanName !== 'walk-in customer' && l.customer_name && l.customer_name.trim().toLowerCase() === cleanName) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public reconcileCustomersAndInvoices(): void {
    let changed = false;

    // 1. Link orphan invoices to existing or new customers
    for (const inv of this.store.invoices) {
      const rawName = (inv.customer_name || '').trim();
      const rawMobile = (inv.customer_mobile || '').trim();
      const cleanDigits = rawMobile.replace(/\D/g, '');
      const isWalkIn = !rawName || rawName.toLowerCase() === 'walk-in customer';

      if (isWalkIn && cleanDigits.length < 7) continue;

      let cust = inv.customer_id ? this.store.customers.find((c) => c.id === inv.customer_id) : undefined;
      if (!cust && cleanDigits.length >= 7) {
        cust = this.store.customers.find((c) => c.mobile && c.mobile.replace(/\D/g, '').includes(cleanDigits));
      }
      if (!cust && !isWalkIn) {
        cust = this.store.customers.find((c) => c.name && c.name.toLowerCase().trim() === rawName.toLowerCase());
      }

      if (!cust && (!isWalkIn || cleanDigits.length >= 7)) {
        cust = {
          id: `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: !isWalkIn ? rawName : `Customer ${rawMobile}`,
          mobile: rawMobile,
          email: '',
          address: inv.customer_address || '',
          gst_number: inv.customer_gstin || '',
          balance_due: 0,
          loyalty_points: 0,
          total_spent: 0,
          created_at: inv.created_at || new Date().toISOString(),
        };
        this.store.customers.unshift(cust);
        this.syncToServer('upsert', { table: 'customers', data: cust });
        changed = true;
      }

      if (cust && inv.customer_id !== cust.id) {
        inv.customer_id = cust.id;
        inv.customer_name = cust.name;
        this.syncToServer('upsert', { table: 'invoices', data: inv });
        changed = true;
      }
    }

    // 2. Re-compute each customer's balance_due and total_spent from invoices
    for (const cust of this.store.customers) {
      const invoices = this.getCustomerInvoices(cust.id, cust.name, cust.mobile);
      const totalSpent = invoices.reduce((s, i) => s + Number(i.grand_total || 0), 0);
      const totalInvoiceDue = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

      if (Number(cust.total_spent || 0) !== totalSpent || Number(cust.balance_due || 0) !== totalInvoiceDue) {
        cust.total_spent = totalSpent;
        cust.balance_due = totalInvoiceDue;
        this.syncToServer('upsert', { table: 'customers', data: cust });
        changed = true;
      }
    }

    if (changed) {
      this.persistLocal();
    }
  }

  // ==========================================
  // INVOICE & BILLING METHODS
  // ==========================================

  public getInvoices(): Invoice[] {
    return [...this.store.invoices]
      .map((inv) => ({
        ...inv,
        items: inv.items && inv.items.length > 0
          ? inv.items
          : this.store.invoice_items.filter((it) => it.invoice_id === inv.id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getInvoice(id: string): Invoice | undefined {
    const inv = this.store.invoices.find((i) => i.id === id);
    if (!inv) return undefined;
    return {
      ...inv,
      items: inv.items && inv.items.length > 0
        ? inv.items
        : this.store.invoice_items.filter((it) => it.invoice_id === inv.id),
    };
  }

  public async createInvoice(saleData: {
    customer_id?: string;
    customer_name?: string;
    customer_mobile?: string;
    customer_address?: string;
    customer_gstin?: string;
    invoice_type?: 'GST' | 'NON_GST' | 'MIXED';
    bill_mode?: 'RETAIL' | 'WHOLESALE';
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    round_off?: number;
    grand_total: number;
    amount_paid?: number;
    balance_due?: number;
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'SPLIT';
    payment_status?: 'PAID' | 'UNPAID' | 'PARTIAL' | 'PENDING';
    items: Array<{
      product_id?: string;
      barcode?: string;
      product_name: string;
      qty: number;
      unit?: string;
      unit_price: number;
      mrp?: number;
      gst_rate?: number;
      tax_rate?: number;
      tax_amount?: number;
      total_price: number;
    }>;
    notes?: string;
    created_by?: string;
  }): Promise<Invoice> {
    const now = new Date().toISOString();
    const invId = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const prefix = this.store.settings.invoice_prefix || 'BD-';
    const invNumber = `${prefix}${Date.now().toString().slice(-6)}`;

    const grandTotal = Number(saleData.grand_total || 0);
    const amountPaid = saleData.amount_paid !== undefined ? Number(saleData.amount_paid) : grandTotal;
    const balanceDue = saleData.balance_due !== undefined ? Number(saleData.balance_due) : Math.max(0, grandTotal - amountPaid);
    
    let paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL' | 'PENDING' = 'PAID';
    if (balanceDue > 0 && amountPaid === 0) {
      paymentStatus = 'UNPAID';
    } else if (balanceDue > 0 && amountPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PAID';
    }
    if (saleData.payment_status) {
      paymentStatus = saleData.payment_status;
    }

    const lineItems: InvoiceItem[] = saleData.items.map((it, idx) => ({
      id: `it_${invId}_${idx + 1}`,
      invoice_id: invId,
      product_id: it.product_id,
      barcode: it.barcode,
      product_name: it.product_name,
      qty: Number(it.qty || 1),
      unit: it.unit || 'Pcs',
      unit_price: Number(it.unit_price || 0),
      mrp: Number(it.mrp || 0),
      tax_rate: Number(it.tax_rate ?? it.gst_rate ?? 0),
      gst_rate: Number(it.gst_rate ?? it.tax_rate ?? 0),
      tax_amount: Number(it.tax_amount || 0),
      total_price: Number(it.total_price || 0),
      total: Number(it.total_price || 0),
    }));

    const newInvoice: Invoice = {
      id: invId,
      invoice_number: invNumber,
      customer_id: saleData.customer_id,
      customer_name: saleData.customer_name || 'Walk-in Customer',
      customer_mobile: saleData.customer_mobile || '',
      customer_address: saleData.customer_address,
      customer_gstin: saleData.customer_gstin,
      invoice_type: saleData.invoice_type || 'GST',
      bill_mode: saleData.bill_mode || 'RETAIL',
      subtotal: Number(saleData.subtotal || 0),
      tax_amount: Number(saleData.tax_amount || 0),
      discount_amount: Number(saleData.discount_amount || 0),
      round_off: Number(saleData.round_off || 0),
      grand_total: grandTotal,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      payment_method: saleData.payment_method,
      payment_status: paymentStatus,
      items: lineItems,
      notes: saleData.notes,
      created_by: saleData.created_by || 'Admin',
      created_at: now,
    };

    // 1. Add to local memory store
    this.store.invoices.unshift(newInvoice);
    this.store.invoice_items.push(...lineItems);

    // 2. Deduct product quantities
    lineItems.forEach((it) => {
      const p = this.store.inventory.find(
        (x) => (it.product_id && x.id === it.product_id) || (it.barcode && x.barcode === it.barcode)
      );
      if (p) {
        p.stock_qty = Number(p.stock_qty || 0) - Number(it.qty || 0);
        this.syncToServer('upsert', { table: 'inventory', data: p });
      }
    });

    // 3. Resolve, create or update customer, update balance, and record Ledger
    let cust: Customer | undefined;
    if (saleData.customer_id) {
      cust = this.store.customers.find((c) => c.id === saleData.customer_id);
    }

    const rawMobile = (saleData.customer_mobile || '').trim();
    const cleanDigits = rawMobile.replace(/\D/g, '');
    const rawName = (saleData.customer_name || '').trim();
    const isWalkIn = !rawName || rawName.toLowerCase() === 'walk-in customer';

    // Fallback 1: match by mobile
    if (!cust && cleanDigits.length >= 7) {
      cust = this.store.customers.find(
        (c) => c.mobile && c.mobile.replace(/\D/g, '').includes(cleanDigits)
      );
    }

    // Fallback 2: match by name
    if (!cust && !isWalkIn) {
      cust = this.store.customers.find(
        (c) => c.name && c.name.toLowerCase().trim() === rawName.toLowerCase()
      );
    }

    // Fallback 3: Auto-create customer if name or mobile provided
    if (!cust && (!isWalkIn || cleanDigits.length >= 7)) {
      const newCustName = !isWalkIn ? rawName : `Customer ${rawMobile}`;
      cust = {
        id: `cust-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: newCustName,
        mobile: rawMobile,
        email: '',
        address: saleData.customer_address || '',
        gst_number: saleData.customer_gstin || '',
        balance_due: 0,
        loyalty_points: 0,
        total_spent: 0,
        created_at: now,
      };
      this.store.customers.unshift(cust);
    }

    if (cust) {
      newInvoice.customer_id = cust.id;
      newInvoice.customer_name = cust.name;
      if (!cust.mobile && rawMobile) cust.mobile = rawMobile;
      if (!cust.address && saleData.customer_address) cust.address = saleData.customer_address;
      if (!cust.gst_number && saleData.customer_gstin) cust.gst_number = saleData.customer_gstin;

      const prevBal = Number(cust.balance_due || 0);
      cust.balance_due = Math.max(0, prevBal + balanceDue);
      cust.total_spent = Number(cust.total_spent || 0) + grandTotal;

      this.syncToServer('upsert', { table: 'customers', data: cust });

      // Ledger Entry 1: Invoice Debit
      const debitEntry: LedgerEntry = {
        id: `ledg_${Date.now().toString(36)}_d`,
        customer_id: cust.id,
        customer_name: cust.name,
        customer_mobile: cust.mobile,
        date: now,
        type: 'DEBIT',
        amount: grandTotal,
        balance_after: prevBal + grandTotal,
        reference_type: 'INVOICE',
        reference_id: invNumber,
        payment_mode: saleData.payment_method,
        notes: `Invoice billed #${invNumber}`,
        created_at: now,
      };
      this.store.ledger.unshift(debitEntry);
      this.syncToServer('upsert', { table: 'ledger', data: debitEntry });

      // Ledger Entry 2: Payment Credit if paid at invoice creation
      if (amountPaid > 0) {
        const creditEntry: LedgerEntry = {
          id: `ledg_${Date.now().toString(36)}_c`,
          customer_id: cust.id,
          customer_name: cust.name,
          customer_mobile: cust.mobile,
          date: now,
          type: 'CREDIT',
          amount: amountPaid,
          balance_after: cust.balance_due,
          reference_type: 'PAYMENT',
          reference_id: invNumber,
          payment_mode: saleData.payment_method,
          notes: `Payment received for bill #${invNumber}`,
          created_at: now,
        };
        this.store.ledger.unshift(creditEntry);
        this.syncToServer('upsert', { table: 'ledger', data: creditEntry });
      }
    }

    this.persistLocal();
    this.syncToServer('upsert_invoice', { invoice: newInvoice, items: lineItems });
    return newInvoice;
  }

  public updateInvoice(invoiceOrId: Invoice | string, updates?: Partial<Invoice>): any {
    const id = typeof invoiceOrId === 'string' ? invoiceOrId : invoiceOrId.id;
    const idx = this.store.invoices.findIndex((i) => i.id === id);
    if (idx >= 0) {
      const existing = this.store.invoices[idx];
      const merged = typeof invoiceOrId === 'string' ? { ...existing, ...updates } : { ...existing, ...invoiceOrId };
      this.store.invoices[idx] = merged as Invoice;
      this.persistLocal();
      this.syncToServer('upsert', { table: 'invoices', data: merged });
      return merged;
    }
    return typeof invoiceOrId === 'object' ? invoiceOrId : null;
  }

  public deleteInvoice(id: string): boolean {
    this.store.invoices = this.store.invoices.filter((i) => i.id !== id);
    this.store.invoice_items = this.store.invoice_items.filter((i) => i.invoice_id !== id);
    this.persistLocal();
    this.syncToServer('delete', { table: 'invoices', id });
    return true;
  }

  public updateInvoicePaymentStatus(
    invoiceId: string,
    status: 'PAID' | 'UNPAID' | 'PARTIAL',
    amountPaid: number,
    paymentMode: 'CASH' | 'UPI' | 'CARD' | 'BANK' | 'CHEQUE' = 'CASH'
  ): boolean {
    const invoice = this.store.invoices.find((i) => i.id === invoiceId);
    if (!invoice) return false;

    const prevBal = invoice.balance_due || 0;
    invoice.amount_paid = amountPaid;
    invoice.balance_due = Math.max(0, invoice.grand_total - amountPaid);
    invoice.payment_status = status;
    const amountCleared = prevBal - invoice.balance_due;

    if (invoice.customer_id && amountCleared > 0) {
      const cust = this.store.customers.find((c) => c.id === invoice.customer_id);
      if (cust) {
        cust.balance_due = Math.max(0, (cust.balance_due || 0) - amountCleared);
        const settleEntry: LedgerEntry = {
          id: `ledg_${Date.now().toString(36)}`,
          customer_id: cust.id,
          customer_name: cust.name,
          customer_mobile: cust.mobile,
          date: new Date().toISOString(),
          type: 'CREDIT',
          amount: amountCleared,
          balance_after: cust.balance_due,
          reference_type: 'INVOICE_SETTLEMENT',
          reference_id: invoice.invoice_number,
          payment_mode: paymentMode,
          notes: `Settlement for invoice #${invoice.invoice_number}`,
          created_at: new Date().toISOString(),
        };
        this.store.ledger.unshift(settleEntry);
        this.syncToServer('upsert', { table: 'customers', data: cust });
        this.syncToServer('upsert', { table: 'ledger', data: settleEntry });
      }
    }

    this.persistLocal();
    this.syncToServer('upsert', { table: 'invoices', data: invoice });
    return true;
  }

  // ==========================================
  // LEDGER METHODS
  // ==========================================

  public getLedger(): LedgerEntry[] {
    return [...this.store.ledger].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  public recordLedgerPayment(data: {
    customer_id: string;
    customer_name?: string;
    customer_mobile?: string;
    amount: number;
    payment_mode: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
    reference_id?: string;
    invoice_id?: string;
    notes?: string;
    date?: string;
  }): LedgerEntry {
    const now = data.date || new Date().toISOString();
    const payAmount = Number(data.amount || 0);
    const cust = this.store.customers.find((c) => c.id === data.customer_id);

    const prevBal = cust ? cust.balance_due || 0 : 0;
    const newBal = Math.max(0, prevBal - payAmount);

    if (cust) {
      cust.balance_due = newBal;
      this.syncToServer('upsert', { table: 'customers', data: cust });
    }

    if (data.invoice_id) {
      const inv = this.store.invoices.find((i) => i.id === data.invoice_id);
      if (inv) {
        inv.amount_paid = (inv.amount_paid || 0) + payAmount;
        inv.balance_due = Math.max(0, inv.grand_total - inv.amount_paid);
        inv.payment_status = inv.balance_due === 0 ? 'PAID' : 'PARTIAL';
        this.syncToServer('upsert', { table: 'invoices', data: inv });
      }
    }

    const entry: LedgerEntry = {
      id: `ledg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      customer_id: data.customer_id,
      customer_name: data.customer_name || cust?.name || 'Customer',
      customer_mobile: data.customer_mobile || cust?.mobile || '',
      date: now,
      type: 'CREDIT',
      amount: payAmount,
      balance_after: newBal,
      reference_type: 'PAYMENT',
      reference_id: data.reference_id || `PAY-${Date.now().toString().slice(-6)}`,
      payment_mode: data.payment_mode,
      notes: data.notes || 'Khata payment received',
      created_at: now,
    };

    this.store.ledger.unshift(entry);
    this.persistLocal();
    this.syncToServer('upsert', { table: 'ledger', data: entry });
    return entry;
  }

  // ==========================================
  // SETTINGS & USERS
  // ==========================================

  public getSettings(): Settings {
    return { ...this.store.settings };
  }

  public updateSettings(newSettings: Partial<Settings>): Settings {
    this.store.settings = { ...this.store.settings, ...newSettings };
    this.persistLocal();

    // Persist all updated settings keys into SQLite
    Object.entries(newSettings).forEach(([key, value]) => {
      this.syncToServer('upsert', {
        table: 'settings',
        data: { key, value },
      });
    });

    return { ...this.store.settings };
  }

  public getUsers(): User[] {
    return [...this.store.users];
  }

  public authenticate(username: string, pin: string): User | null {
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();
    const match = this.store.users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.pin === cleanPin
    );
    return match || null;
  }

  public saveUser(user: Partial<User>): User {
    const existingIndex = this.store.users.findIndex((u) => u.id === user.id);
    let saved: User;
    if (existingIndex >= 0) {
      saved = { ...this.store.users[existingIndex], ...user } as User;
      this.store.users[existingIndex] = saved;
    } else {
      saved = {
        id: user.id || `usr-${Date.now().toString(36)}`,
        username: user.username || 'staff',
        pin: user.pin || '1234',
        role: user.role || 'Cashier',
        created_at: new Date().toISOString(),
      };
      this.store.users.push(saved);
    }
    this.persistLocal();
    this.syncToServer('upsert', { table: 'users', data: saved });
    return saved;
  }

  public deleteUser(id: string): boolean {
    this.store.users = this.store.users.filter((u) => u.id !== id && u.username !== id);
    this.persistLocal();
    this.syncToServer('delete', { table: 'users', id });
    return true;
  }

  public getStore(): DBStore {
    return { ...this.store };
  }

  // Backward compatibility placeholders
  public getVendors() { return []; }
  public getPurchaseOrders() { return []; }
  public getPurchaseOrder(_id: string) { return null; }
  public saveVendor(_v: any) { return null; }
  public deleteVendor(_id: string) { return true; }
  public savePurchaseOrder(_po: any) { return null; }
  public updatePOStatus(_id: string, _s: string) { return true; }
  public deletePurchaseOrder(_id: string) { return true; }
  public getServiceTickets() { return []; }
  public saveServiceTicket(_t: any) { return null; }
  public getScrapEntries() { return []; }
  public saveScrapEntry(_s: any) { return null; }
  public getBackupsLog(): BackupLog[] { return [...this.store.backups_log]; }
  public logBackup(filename: string, type: 'MANUAL' | 'SCHEDULED', sizeKb: number, status: 'SUCCESS' | 'FAILED') {
    const log: BackupLog = {
      id: `bkp-${Date.now()}`,
      filename,
      type,
      size_kb: sizeKb,
      timestamp: new Date().toISOString(),
      status,
    };
    this.store.backups_log.unshift(log);
    this.persistLocal();
    this.syncToServer('upsert', { table: 'backups_log', data: log });
  }

  public async restoreFullBackup(data: any): Promise<boolean> {
    if (!data) return false;
    this.store = { ...DEFAULT_STORE, ...data };
    this.persistLocal();
    await this.syncToServer('bulk_seed', { store: data });
    return true;
  }

  public returnInvoiceItem(invoiceId: string, itemId: string, qty: number): boolean {
    const item = this.store.invoice_items.find((it) => it.id === itemId || it.invoice_id === invoiceId);
    if (item && item.qty >= qty) {
      item.qty -= qty;
      if (item.product_id) {
        const p = this.store.inventory.find((x) => x.id === item.product_id);
        if (p) {
          p.stock_qty += qty;
          this.syncToServer('upsert', { table: 'inventory', data: p });
        }
      }
      this.persistLocal();
      return true;
    }
    return false;
  }

  public getGoogleSheetsUrl(): string { return ''; }
  public pullServerUpdates(): Promise<boolean> { return this.fetchFromServer(); }

  public async clearTransactionsOnly() {
    this.store.invoices = [];
    this.store.invoice_items = [];
    this.store.ledger = [];
    this.persistLocal();
    await this.syncToServer('clear_transactions');
  }

  public async factoryResetStore(options?: any) {
    this.store = { ...DEFAULT_STORE };
    this.persistLocal();
    await this.syncToServer('factory_reset', { options });
  }
}

export const db = new BillDeskDB();
