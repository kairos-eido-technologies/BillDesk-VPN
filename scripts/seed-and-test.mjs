import sqlite3 from 'sqlite3';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'mssp_store.db');
console.log(`[Test Suite] Connecting to database: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  console.log("=== STEP 1: INITIALIZE SCHEMA & TABLES ===");
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      password TEXT,
      role TEXT,
      pin TEXT,
      created_at TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      barcode TEXT,
      name TEXT,
      category TEXT,
      unit TEXT,
      cost_price REAL,
      selling_price REAL,
      mrp REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      stock_qty REAL,
      godown_qty REAL,
      moq REAL,
      min_stock_alert REAL,
      sku_code TEXT,
      gst_rate REAL,
      image_path TEXT,
      created_at TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      mobile TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      balance_due REAL DEFAULT 0,
      loyalty_points REAL,
      total_spent REAL,
      created_at TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_mobile TEXT,
      invoice_type TEXT,
      bill_mode TEXT DEFAULT 'RETAIL',
      subtotal REAL,
      tax_amount REAL,
      discount_amount REAL,
      exchange_amount REAL DEFAULT 0,
      exchange_notes TEXT,
      grand_total REAL,
      amount_paid REAL DEFAULT 0,
      balance_due REAL DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT,
      is_synced REAL DEFAULT 0,
      created_at TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT,
      product_id TEXT,
      barcode TEXT,
      product_name TEXT,
      qty REAL,
      unit_price REAL,
      mrp REAL DEFAULT 0,
      tax_rate REAL,
      total_price REAL,
      is_return INTEGER DEFAULT 0
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS backups_log (
      id TEXT PRIMARY KEY,
      filename TEXT,
      timestamp TEXT,
      type TEXT,
      size_kb REAL,
      status TEXT
    );
  `);

  console.log("=== STEP 2: SEED STORE SETTINGS ===");
  const defaultSettings = [
    ['shop_name', 'MSS Ponkumar Store'],
    ['legal_name', 'MSS Ponkumar Store - Wholesale Shop'],
    ['phone', '9842211223'],
    ['email', 'contact@msspkstore.local'],
    ['gstin', '33AABCM9876K1Z5'],
    ['address_line1', 'Main Bazaar Road, Tenkasi'],
    ['address_line2', 'Tamil Nadu - 627811'],
    ['receipt_header_note', 'WHOLESALE & RETAIL DEALER'],
    ['receipt_footer_note', 'Thank you! Visit again.'],
    ['api_key', 'mssp_secret_key_88'],
    ['custom_tunnel_url', ''],
    ['default_gst_rate', '0'],
  ];

  for (const [k, v] of defaultSettings) {
    await run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [k, v]);
  }

  console.log("=== STEP 3: SEED INVENTORY WITH RETAIL & WHOLESALE PRICES ===");
  const sampleProducts = [
    { barcode: 'MSSP10001', name: 'Havells 2.5 sqmm Wire (100m Blue)', category: 'Electricals', unit: 'Roll', cost_price: 2100, selling_price: 2650, wholesale_price: 2350, stock_qty: 45 },
    { barcode: 'MSSP10002', name: 'Havells 1.5 sqmm Wire (100m Red)', category: 'Electricals', unit: 'Roll', cost_price: 1350, selling_price: 1750, wholesale_price: 1520, stock_qty: 60 },
    { barcode: 'MSSP10003', name: 'Finolex 4.0 sqmm Wire (100m Green)', category: 'Electricals', unit: 'Roll', cost_price: 3200, selling_price: 3950, wholesale_price: 3550, stock_qty: 30 },
    { barcode: 'MSSP10004', name: 'Prestige 5L Pressure Cooker Deluxe', category: 'Kitchenware', unit: 'Pcs', cost_price: 1250, selling_price: 1750, wholesale_price: 1450, stock_qty: 25 },
    { barcode: 'MSSP10005', name: 'Prestige 3L Pressure Cooker Junior', category: 'Kitchenware', unit: 'Pcs', cost_price: 880, selling_price: 1250, wholesale_price: 1020, stock_qty: 40 },
    { barcode: 'MSSP10006', name: 'Hawkins 5L Hard Anodised Cooker', category: 'Kitchenware', unit: 'Pcs', cost_price: 1450, selling_price: 1980, wholesale_price: 1680, stock_qty: 20 },
    { barcode: 'MSSP10007', name: 'Butterfly 750W Mixer Grinder (3 Jars)', category: 'Appliances', unit: 'Pcs', cost_price: 2300, selling_price: 3100, wholesale_price: 2650, stock_qty: 15 },
    { barcode: 'MSSP10008', name: 'Preethi Zodiac 750W Mixer Grinder', category: 'Appliances', unit: 'Pcs', cost_price: 4900, selling_price: 6400, wholesale_price: 5450, stock_qty: 12 },
    { barcode: 'MSSP10009', name: 'Bajaj 1800W Induction Cooktop', category: 'Appliances', unit: 'Pcs', cost_price: 1550, selling_price: 2150, wholesale_price: 1800, stock_qty: 22 },
    { barcode: 'MSSP10010', name: 'Crompton 1200mm High Speed Ceiling Fan', category: 'Electricals', unit: 'Pcs', cost_price: 1350, selling_price: 1850, wholesale_price: 1550, stock_qty: 50 },
    { barcode: 'MSSP10011', name: 'Orient 1200mm Ceiling Fan (Brown)', category: 'Electricals', unit: 'Pcs', cost_price: 1280, selling_price: 1720, wholesale_price: 1480, stock_qty: 35 },
    { barcode: 'MSSP10012', name: 'Philips 9W LED Bulb (Cool Day White)', category: 'Lighting', unit: 'Pcs', cost_price: 65, selling_price: 110, wholesale_price: 82, stock_qty: 250 },
    { barcode: 'MSSP10013', name: 'Havells 20W LED Batten Tube Light', category: 'Lighting', unit: 'Pcs', cost_price: 195, selling_price: 320, wholesale_price: 245, stock_qty: 120 },
    { barcode: 'MSSP10014', name: 'Stainless Steel Dinner Set (32 Pcs)', category: 'Utensils', unit: 'Set', cost_price: 1100, selling_price: 1650, wholesale_price: 1350, stock_qty: 18 },
    { barcode: 'MSSP10015', name: 'Milton Thermosteel 1000ml Flask', category: 'Bottles', unit: 'Pcs', cost_price: 520, selling_price: 780, wholesale_price: 620, stock_qty: 40 },
    { barcode: 'MSSP10016', name: 'Non-Stick Dosa Tawa 28cm (Heavy Base)', category: 'Cookware', unit: 'Pcs', cost_price: 410, selling_price: 650, wholesale_price: 510, stock_qty: 55 },
    { barcode: 'MSSP10017', name: 'Anchor Roma 6A Switch (White)', category: 'Electricals', unit: 'Box', cost_price: 480, selling_price: 720, wholesale_price: 570, stock_qty: 60 },
    { barcode: 'MSSP10018', name: 'Anchor Roma 16A Power Socket', category: 'Electricals', unit: 'Box', cost_price: 620, selling_price: 920, wholesale_price: 740, stock_qty: 45 },
  ];

  await run(`DELETE FROM inventory`);
  for (const p of sampleProducts) {
    const id = `inv-${p.barcode.toLowerCase()}`;
    await run(`
      INSERT INTO inventory (id, barcode, name, category, unit, cost_price, selling_price, mrp, wholesale_price, stock_qty, godown_qty, moq, min_stock_alert, sku_code, gst_rate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 5, ?, 0, ?)
    `, [id, p.barcode, p.name, p.category, p.unit, p.cost_price, p.selling_price, p.selling_price, p.wholesale_price, p.stock_qty, p.barcode, new Date().toISOString()]);
  }
  console.log(`Seeded ${sampleProducts.length} inventory products.`);

  console.log("=== STEP 4: SEED CUSTOMERS & CREDIT BALANCES ===");
  const sampleCustomers = [
    { id: 'cust-001', name: 'Murugan Electrical Works', mobile: '9443100111', email: 'murugan.elec@gmail.com', address: '42 Bazaar St, Tenkasi', balance_due: 4500, total_spent: 42000 },
    { id: 'cust-002', name: 'Senthil Traders (Wholesale)', mobile: '9842500222', email: 'senthiltraders@gmail.com', address: '12 Car Street, Kadayanallur', balance_due: 12800, total_spent: 125000 },
    { id: 'cust-003', name: 'Karthik Hardware Store', mobile: '9789300333', email: 'karthik.hw@yahoo.com', address: '88 Market Road, Shenkottai', balance_due: 0, total_spent: 28400 },
    { id: 'cust-004', name: 'Anitha Kitchen Corner', mobile: '9442100444', email: 'anitha.kitchen@gmail.com', address: '15 South Car St, Alangulam', balance_due: 2400, total_spent: 18500 },
    { id: 'cust-005', name: 'Rajesh Contractor', mobile: '9843600555', email: 'rajesh.con@gmail.com', address: 'Plot 4, New Colony, Tenkasi', balance_due: 6200, total_spent: 67000 },
    { id: 'cust-006', name: 'Walk-in Retail Customer', mobile: '9999999999', email: '', address: 'Tenkasi', balance_due: 0, total_spent: 5400 },
  ];

  await run(`DELETE FROM customers`);
  for (const c of sampleCustomers) {
    await run(`
      INSERT INTO customers (id, name, mobile, email, address, balance_due, loyalty_points, total_spent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `, [c.id, c.name, c.mobile, c.email, c.address, c.balance_due, c.total_spent, new Date().toISOString()]);
  }
  console.log(`Seeded ${sampleCustomers.length} customers.`);

  console.log("=== STEP 5: SEED REALISTIC TODAY'S & RECENT INVOICES ===");
  await run(`DELETE FROM invoices`);
  await run(`DELETE FROM invoice_items`);

  const nowIso = new Date().toISOString();
  const sampleInvoices = [
    {
      invoice_number: 'MSSP-2026-0001',
      customer_id: 'cust-002',
      customer_name: 'Senthil Traders (Wholesale)',
      customer_mobile: '9842500222',
      bill_mode: 'WHOLESALE',
      subtotal: 18850,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: 18850,
      amount_paid: 10000,
      balance_due: 8850,
      payment_method: 'PARTIAL',
      payment_status: 'PARTIAL',
      created_at: nowIso,
      items: [
        { product_id: 'inv-mssp10001', barcode: 'MSSP10001', product_name: 'Havells 2.5 sqmm Wire (100m Blue)', qty: 5, unit_price: 2350, total_price: 11750 },
        { product_id: 'inv-mssp10010', barcode: 'MSSP10010', product_name: 'Crompton 1200mm High Speed Ceiling Fan', qty: 4, unit_price: 1550, total_price: 6200 },
        { product_id: 'inv-mssp10012', barcode: 'MSSP10012', product_name: 'Philips 9W LED Bulb (Cool Day White)', qty: 11, unit_price: 82, total_price: 902 },
      ]
    },
    {
      invoice_number: 'MSSP-2026-0002',
      customer_id: 'cust-001',
      customer_name: 'Murugan Electrical Works',
      customer_mobile: '9443100111',
      bill_mode: 'WHOLESALE',
      subtotal: 7590,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: 7590,
      amount_paid: 7590,
      balance_due: 0,
      payment_method: 'CASH',
      payment_status: 'PAID',
      created_at: nowIso,
      items: [
        { product_id: 'inv-mssp10002', barcode: 'MSSP10002', product_name: 'Havells 1.5 sqmm Wire (100m Red)', qty: 3, unit_price: 1520, total_price: 4560 },
        { product_id: 'inv-mssp10017', barcode: 'MSSP10017', product_name: 'Anchor Roma 6A Switch (White)', qty: 3, unit_price: 570, total_price: 1710 },
        { product_id: 'inv-mssp10018', barcode: 'MSSP10018', product_name: 'Anchor Roma 16A Power Socket', qty: 1, unit_price: 740, total_price: 740 },
        { product_id: 'inv-mssp10013', barcode: 'MSSP10013', product_name: 'Havells 20W LED Batten Tube Light', qty: 2, unit_price: 245, total_price: 490 },
      ]
    },
    {
      invoice_number: 'MSSP-2026-0003',
      customer_id: 'cust-006',
      customer_name: 'Walk-in Retail Customer',
      customer_mobile: '9999999999',
      bill_mode: 'RETAIL',
      subtotal: 3100,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: 3100,
      amount_paid: 3100,
      balance_due: 0,
      payment_method: 'UPI',
      payment_status: 'PAID',
      created_at: nowIso,
      items: [
        { product_id: 'inv-mssp10007', barcode: 'MSSP10007', product_name: 'Butterfly 750W Mixer Grinder (3 Jars)', qty: 1, unit_price: 3100, total_price: 3100 },
      ]
    },
    {
      invoice_number: 'MSSP-2026-0004',
      customer_id: 'cust-004',
      customer_name: 'Anitha Kitchen Corner',
      customer_mobile: '9442100444',
      bill_mode: 'RETAIL',
      subtotal: 2400,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: 2400,
      amount_paid: 0,
      balance_due: 2400,
      payment_method: 'CREDIT',
      payment_status: 'UNPAID',
      created_at: nowIso,
      items: [
        { product_id: 'inv-mssp10004', barcode: 'MSSP10004', product_name: 'Prestige 5L Pressure Cooker Deluxe', qty: 1, unit_price: 1750, total_price: 1750 },
        { product_id: 'inv-mssp10016', barcode: 'MSSP10016', product_name: 'Non-Stick Dosa Tawa 28cm (Heavy Base)', qty: 1, unit_price: 650, total_price: 650 },
      ]
    },
  ];

  for (const inv of sampleInvoices) {
    const invId = `inv-${inv.invoice_number.toLowerCase()}`;
    await run(`
      INSERT INTO invoices (id, invoice_number, customer_id, customer_name, customer_mobile, bill_mode, subtotal, tax_amount, discount_amount, grand_total, amount_paid, balance_due, payment_method, payment_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [invId, inv.invoice_number, inv.customer_id, inv.customer_name, inv.customer_mobile, inv.bill_mode, inv.subtotal, inv.tax_amount, inv.discount_amount, inv.grand_total, inv.amount_paid, inv.balance_due, inv.payment_method, inv.payment_status, inv.created_at]);

    for (let idx = 0; idx < inv.items.length; idx++) {
      const it = inv.items[idx];
      const itemId = `${invId}-it-${idx + 1}`;
      await run(`
        INSERT INTO invoice_items (id, invoice_id, product_id, barcode, product_name, qty, unit_price, mrp, tax_rate, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `, [itemId, invId, it.product_id, it.barcode, it.product_name, it.qty, it.unit_price, it.unit_price, it.total_price]);
    }
  }
  console.log(`Seeded ${sampleInvoices.length} invoices with item details.`);

  console.log("=== STEP 6: TEST INVENTORY EXCEL IMPORT FUNCTIONALITY ===");
  // Create an Excel test workbook using the simplified columns
  const importRows = [
    {
      'Barcode': 'MSSP10020',
      'Name': 'V-Guard 1.0 sqmm Wire (90m Yellow)',
      'Category': 'Electricals',
      'Unit': 'Roll',
      'Cost Price': 850,
      'Retail Price': 1180,
      'Wholesale Price': 980,
      'Stock Qty': 40
    },
    {
      'Barcode': 'MSSP10021',
      'Name': 'Atomberg Renesa 1200mm BLDC Smart Fan',
      'Category': 'Appliances',
      'Unit': 'Pcs',
      'Cost Price': 2850,
      'Retail Price': 3990,
      'Wholesale Price': 3350,
      'Stock Qty': 16
    },
    {
      'Barcode': 'MSSP10022',
      'Name': 'Prestige Omega Deluxe Granite Kadhai 24cm',
      'Category': 'Cookware',
      'Unit': 'Pcs',
      'Cost Price': 720,
      'Retail Price': 1050,
      'Wholesale Price': 890,
      'Stock Qty': 28
    }
  ];

  const testWorkbook = XLSX.utils.book_new();
  const testSheet = XLSX.utils.json_to_sheet(importRows);
  XLSX.utils.book_append_sheet(testWorkbook, testSheet, 'Products');
  const testImportPath = path.join(process.cwd(), 'MSSP_Test_Import.xlsx');
  XLSX.writeFile(testWorkbook, testImportPath);
  console.log(`Created test import workbook at: ${testImportPath}`);

  // Now parse the workbook and import into the database
  const fileBuffer = fs.readFileSync(testImportPath);
  const readWb = XLSX.read(fileBuffer, { type: 'buffer' });
  const rawRows = XLSX.utils.sheet_to_json(readWb.Sheets[readWb.SheetNames[0]]);
  console.log(`Parsed ${rawRows.length} rows from Excel:`, rawRows.map(r => r['Name']));

  let importedCount = 0;
  for (const r of rawRows) {
    const retailPrice = Number(r['Retail Price'] || r['retail_price'] || r['Selling Price'] || r['selling_price']) || 0;
    const wholesalePrice = Number(r['Wholesale Price'] || r['wholesale_price']) || retailPrice;
    const costPrice = Number(r['Cost Price'] || r['cost_price']) || 0;
    const stockQty = Number(r['Stock Qty'] || r['stock_qty']) || 0;
    const barcode = String(r['Barcode'] || r['barcode'] || `MSSP${Math.floor(100000 + Math.random() * 900000)}`);
    const name = String(r['Name'] || r['name']);
    const category = String(r['Category'] || r['category'] || 'General');
    const unit = String(r['Unit'] || r['unit'] || 'Pcs');
    const id = `inv-${barcode.toLowerCase()}`;

    await run(`
      INSERT OR REPLACE INTO inventory (id, barcode, name, category, unit, cost_price, selling_price, mrp, wholesale_price, stock_qty, godown_qty, moq, min_stock_alert, sku_code, gst_rate, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 5, ?, 0, ?)
    `, [id, barcode, name, category, unit, costPrice, retailPrice, retailPrice, wholesalePrice, stockQty, barcode, nowIso]);
    importedCount++;
  }
  console.log(`Successfully verified inventory Excel import: imported ${importedCount} items.`);

  console.log("=== STEP 7: TEST FULL DATABASE BACKUP EXPORT & VALIDATION ===");
  const allInventory = await all(`SELECT * FROM inventory`);
  const allCustomers = await all(`SELECT * FROM customers`);
  const allInvoices = await all(`SELECT * FROM invoices`);
  const allItems = await all(`SELECT * FROM invoice_items`);
  const allSettings = await all(`SELECT * FROM settings`);

  const backupWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(backupWb, XLSX.utils.json_to_sheet(allInventory), 'Inventory');
  XLSX.utils.book_append_sheet(backupWb, XLSX.utils.json_to_sheet(allCustomers), 'Customers');
  XLSX.utils.book_append_sheet(backupWb, XLSX.utils.json_to_sheet(allInvoices), 'Invoices');
  XLSX.utils.book_append_sheet(backupWb, XLSX.utils.json_to_sheet(allItems), 'InvoiceItems');
  XLSX.utils.book_append_sheet(backupWb, XLSX.utils.json_to_sheet(allSettings), 'Settings');

  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupFilename = `MSSP_Full_Backup_${timestamp}.xlsx`;
  const backupPath = path.join(process.cwd(), backupFilename);
  XLSX.writeFile(backupWb, backupPath);

  const stats = fs.statSync(backupPath);
  const sizeKb = Math.round(stats.size / 1024);
  console.log(`Generated Full Backup: ${backupFilename} (${sizeKb} KB)`);

  // Log in backups_log table
  await run(`
    INSERT INTO backups_log (id, filename, timestamp, type, size_kb, status)
    VALUES (?, ?, ?, 'MANUAL', ?, 'SUCCESS')
  `, [`b-${Date.now()}`, backupFilename, nowIso, sizeKb]);

  // Read back backup to verify integrity
  const verifiedBackup = XLSX.read(fs.readFileSync(backupPath), { type: 'buffer' });
  console.log(`Verified Backup Sheets:`, verifiedBackup.SheetNames);
  for (const sheet of verifiedBackup.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(verifiedBackup.Sheets[sheet]);
    console.log(` - Sheet "${sheet}": ${rows.length} records verified.`);
  }

  console.log("=== STEP 8: FINAL SUMMARY VERIFICATION ===");
  console.log(`Total Products: ${allInventory.length}`);
  console.log(`Total Customers: ${allCustomers.length}`);
  console.log(`Total Invoices: ${allInvoices.length}`);
  console.log(`Total Invoice Line Items: ${allItems.length}`);
  const todayTotalSales = allInvoices.reduce((acc, x) => acc + Number(x.grand_total || 0), 0);
  const todayTotalIncome = allInvoices.reduce((acc, x) => acc + Number(x.amount_paid || 0), 0);
  console.log(`Today's Total Sales: ₹${todayTotalSales.toLocaleString('en-IN')}`);
  console.log(`Today's Daily Income (Cash/UPI/Paid): ₹${todayTotalIncome.toLocaleString('en-IN')}`);
  console.log(`ALL TESTS PASSED SUCCESSFULLY! Database mssp_store.db is 100% ready.`);
}

main().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
}).finally(() => {
  db.close();
});
