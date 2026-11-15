import React, { useRef, useState, useEffect } from "react";
import { db, Invoice, InvoiceItem } from "@/lib/db/db";
import { qty } from "@/lib/format";
import { MSSLogo } from "./KairosLogo";
import { Code128Visual } from "@/lib/code128";

interface A4ReceiptProps {
  invoice: Invoice;
  items: InvoiceItem[];
  storeSettings?: Record<string, any>;
}

/**
 * Generate SVG Barcode lines for Code128 representation of Invoice Number
 */
function SimpleBarcodeSVG({ value }: { value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
      <Code128Visual code={value} height={36} maxW="260px" />
      <div style={{ fontFamily: "monospace", fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", fontWeight: "bold", color: "#000", marginTop: "2px" }}>
        *{value}*
      </div>
    </div>
  );
}

export function A4Receipt({ invoice: i, items = [], storeSettings }: A4ReceiptProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (wrapperRef.current) {
        // Standard A4 width in pixels at 96DPI is ~794px (210mm)
        const containerWidth = wrapperRef.current.clientWidth;
        const targetWidth = 794;
        if (containerWidth < targetWidth && containerWidth > 0) {
          setScale(containerWidth / targetWidth);
        } else {
          setScale(1);
        }
      }
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const shopName = storeSettings?.shop_name || "MSS PONKUMAR STORE";
  const shopHeaderNote = storeSettings?.receipt_header_note || storeSettings?.tagline || "WHOLESALE SHOP";
  const shopAddress = storeSettings?.address_line1 || storeSettings?.shop_address || "MSS Ponkumar Store";
  const shopPhone = storeSettings?.phone || storeSettings?.shop_phone || "";
  const shopGstin = storeSettings?.gstin || storeSettings?.shop_gstin || "";
  const shopLogo = storeSettings?.shop_logo || "/mss-logo.png";
  const showLogo = storeSettings?.show_logo !== false;
  const footerText = storeSettings?.receipt_footer_note || storeSettings?.receipt_footer_message;
  const isWholesale = i.bill_mode === "WHOLESALE";

  const isGst = i.invoice_type === "GST";
  const taxAmount = Number(i.tax_amount || 0);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;

  // Compute MRP & Savings
  let totalMrp = 0;
  let totalSelling = 0;
  items.forEach((it: any) => {
    const itemQty = Number(it.qty || 1);
    const unitPrice = Number(it.unit_price || it.price || 0);
    const prod = it.product_id ? db.getProductById(it.product_id) : (it.barcode ? db.getProductByBarcode(it.barcode) : null);
    const itemMrp = Number(it.mrp && it.mrp > 0 ? it.mrp : (prod?.mrp && prod.mrp > 0 ? prod.mrp : (prod?.selling_price || unitPrice)));
    totalMrp += itemMrp * itemQty;
    totalSelling += unitPrice * itemQty;
  });

  const mrpSavings = Math.max(0, totalMrp - totalSelling);
  const discountSavings = Number(i.discount_amount || 0);
  const totalSaved = mrpSavings + discountSavings;

  const dateStr = new Date(i.created_at || Date.now()).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div ref={wrapperRef} className="w-full flex justify-center items-start print:block print:w-auto">
      {/* ─── EXACT A4 PAPER CONTAINER (210mm x 297mm) ─── */}
      <div
        style={{
          width: "210mm",
          minHeight: "297mm",
          transform: scale < 1 ? `scale(${scale})` : "none",
          transformOrigin: "top center",
          marginBottom: scale < 1 ? `-${(1 - scale) * 1123}px` : "0px",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          lineHeight: "1.5",
          color: "#000",
        }}
        className="a4-sheet bg-white text-black p-10 shadow-2xl border border-gray-300 rounded-sm print:shadow-none print:border-none print:transform-none print:m-0 print:p-8 shrink-0"
      >
        {/* ─── BRANDING HEADER ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #000", paddingBottom: "14px", marginBottom: "16px" }}>
          <div style={{ maxWidth: "60%" }}>
            {showLogo && (
              <div style={{ marginBottom: "8px" }}>
                <img
                  src={shopLogo}
                  alt={shopName}
                  style={{ height: "64px", width: "auto", maxHeight: "64px", objectFit: "contain", borderRadius: "4px" }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", color: "#1B2D6B", lineHeight: "1.2" }}>
              {shopName}
            </div>
            {shopHeaderNote && (
              <div style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#E8151B", marginTop: "2px", letterSpacing: "0.5px" }}>
                {shopHeaderNote}
              </div>
            )}
            {shopAddress && (
              <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "3px", whiteSpace: "pre-line", lineHeight: "1.4" }}>
                {shopAddress}
              </div>
            )}
            {shopPhone && (
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#111827", marginTop: "2px" }}>
                Ph: {shopPhone}
              </div>
            )}
            {isGst && shopGstin && (
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#111827", marginTop: "2px" }}>
                GSTIN: {shopGstin}
              </div>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "16px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", color: isWholesale ? "#E8151B" : "#1B2D6B", border: `2px solid ${isWholesale ? "#E8151B" : "#1B2D6B"}`, padding: "2px 8px", borderRadius: "4px", display: "inline-block" }}>
              {isWholesale ? "WHOLESALE INVOICE" : "RETAIL INVOICE"}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "monospace", color: "#000", marginTop: "4px" }}>
              {i.invoice_number}
            </div>
            <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px" }}>
              <strong>Date:</strong> {dateStr}
            </div>
            <div style={{ fontSize: "11px", color: "#374151" }}>
              <strong>Payment Mode:</strong> <span style={{ textTransform: "uppercase", fontWeight: "bold" }}>{i.payment_method || "CASH"}</span>
            </div>
          </div>
        </div>

        {/* ─── CUSTOMER DETAILS ─── */}
        <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Billed To Customer:
          </div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#0f172a", marginTop: "2px" }}>
            {i.customer_name || "Walk-in Customer"}
          </div>
          {i.customer_mobile && (
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#334155", marginTop: "1px" }}>
              Mobile: {i.customer_mobile}
            </div>
          )}
        </div>

        {/* ─── ITEMS TABLE ─── */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
          <thead>
            <tr style={{ background: "#0f172a", color: "#ffffff" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Item Description</th>
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "100px" }}>Rate (₹)</th>
              <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "70px" }}>Qty</th>
              {isGst && <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "75px" }}>GST%</th>}
              <th style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", width: "120px" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((it: any, idx: number) => {
                const name = it.product_name || it.name || "Item #" + (idx + 1);
                const itemQty = Number(it.qty || 1);
                const unitPrice = Number(it.unit_price || it.price || 0);
                const totalPrice = Number(it.total_price ?? (itemQty * unitPrice));
                const taxRate = isGst ? Number(it.tax_rate || it.gst_rate || 0) : 0;
                const isReturn = Boolean(it.is_return);

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: "bold", color: "#0f172a" }}>
                        {name}
                        {isReturn && (
                          <span style={{ marginLeft: "6px", fontSize: "9px", background: "#000", color: "#fff", padding: "1px 4px", textTransform: "uppercase", borderRadius: "2px" }}>
                            RETURNED
                          </span>
                        )}
                      </div>
                      {it.barcode && <div style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>{it.barcode}</div>}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "600" }}>
                      {unitPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: "bold", fontFamily: "monospace" }}>
                      {qty(itemQty)}
                    </td>
                    {isGst && (
                      <td style={{ padding: "8px 10px", textAlign: "right", fontSize: "11px", color: "#475569" }}>
                        {taxRate}%
                      </td>
                    )}
                    <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
                      {totalPrice.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isGst ? 6 : 5} style={{ padding: "16px", textAlign: "center", fontStyle: "italic", color: "#64748b" }}>
                  No line items attached to bill.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ─── FINANCIAL TOTALS ─── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          <div style={{ width: "320px", fontSize: "11px" }}>
            {totalMrp > totalSelling && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                <span>Total MRP Value:</span>
                <span style={{ fontFamily: "monospace" }}>₹{totalMrp.toFixed(2)}</span>
              </div>
            )}

            {mrpSavings > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#16a34a", borderBottom: "1px solid #f1f5f9" }}>
                <span>Product Savings (-):</span>
                <span style={{ fontFamily: "monospace", fontWeight: "600" }}>-₹{mrpSavings.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#475569" }}>Subtotal:</span>
              <span style={{ fontFamily: "monospace", fontWeight: "600" }}>₹{Number(i.subtotal || 0).toFixed(2)}</span>
            </div>

            {Number(i.discount_amount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#dc2626", borderBottom: "1px solid #f1f5f9" }}>
                <span>Special Discount (-):</span>
                <span style={{ fontFamily: "monospace", fontWeight: "600" }}>-₹{Number(i.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {Number(i.exchange_amount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#d97706", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontWeight: "bold" }}>Exchange ({i.exchange_notes || "Old Item"}):</span>
                <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>-₹{Number(i.exchange_amount).toFixed(2)}</span>
              </div>
            )}

            {isGst && taxAmount > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                  <span>CGST:</span>
                  <span style={{ fontFamily: "monospace" }}>₹{cgst.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#475569", borderBottom: "1px solid #f1f5f9" }}>
                  <span>SGST:</span>
                  <span style={{ fontFamily: "monospace" }}>₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px 0", borderTop: "2px solid #0f172a", marginTop: "6px", fontSize: "14px", fontWeight: "bold", color: "#0f172a" }}>
              <span>GRAND TOTAL:</span>
              <span style={{ fontFamily: "monospace", fontSize: "17px", color: "#000" }}>
                ₹{Number(i.grand_total || 0).toFixed(2)}
              </span>
            </div>

            {/* ─── PROMINENT SAVINGS HIGHLIGHT ─── */}
            {totalSaved > 0 && (
              <div style={{ marginTop: "10px", padding: "8px 12px", background: "#f0fdf4", border: "1px dashed #22c55e", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#15803d", fontWeight: "bold" }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.5px" }}>🎉 TOTAL AMOUNT SAVED:</span>
                <span style={{ fontSize: "15px", fontFamily: "monospace" }}>₹{totalSaved.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── BARCODE SCANNER ─── */}
        <SimpleBarcodeSVG value={i.invoice_number || "INV-0000"} />

        {/* ─── FOOTER & POLICIES ─── */}
        <div style={{ marginTop: "28px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1", textAlign: "center", fontSize: "10px", color: "#475569" }}>
          {footerText ? (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{footerText}</div>
          ) : (
            <>
              <div style={{ fontWeight: "bold", fontSize: "11px", color: "#0f172a" }}>*** Thank You For Your Business! ***</div>
              <div style={{ marginTop: "2px" }}>Goods once sold can be exchanged within 7 days with valid bill.</div>
              <div>Please retain this invoice for warranty & service reference.</div>
              <div style={{ fontWeight: "bold", marginTop: "4px", fontSize: "9px", textTransform: "uppercase" }}>{shopName} • {shopHeaderNote || "WHOLESALE BILLDESK"}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
