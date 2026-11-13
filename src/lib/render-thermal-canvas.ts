import { Invoice, InvoiceItem } from "@/lib/db/db";

interface CanvasReceiptOptions {
  scale?: number;
}

/**
 * Load an image from URL or data URI safely into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Helper to wrap text into multiple lines if it exceeds maxWidth
 */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * Renders an invoice directly onto an HTML5 Canvas with deterministic layout coordinates.
 * This guarantees zero overlapping text, zero CSS variable bugs, and ultra-crisp output.
 */
export async function renderThermalReceiptToCanvas(
  invoice: Invoice,
  items: InvoiceItem[] = [],
  storeSettings?: Record<string, any>,
  options: CanvasReceiptOptions = {}
): Promise<HTMLCanvasElement> {
  const scale = options.scale || 2; // 2x for Retina/High-DPI sharpness
  const canvasWidth = 460;
  const paddingX = 24;
  const contentWidth = canvasWidth - paddingX * 2;
  const leftX = paddingX;
  const rightX = canvasWidth - paddingX;
  const centerX = canvasWidth / 2;

  // Settings
  const shopName = (storeSettings?.shop_name || "MSS PONKUMAR STORE").toUpperCase();
  const shopHeader = (storeSettings?.receipt_header_note || storeSettings?.tagline || "WHOLESALE SHOP").toUpperCase();
  const shopAddress = storeSettings?.address_line1 || storeSettings?.shop_address || "MSS Ponkumar Store";
  const shopPhone = storeSettings?.phone || storeSettings?.shop_phone || "";
  const shopGstin = storeSettings?.gstin || storeSettings?.shop_gstin || "";
  const shopLogo = storeSettings?.shop_logo || "/mss-logo.png";
  const showLogo = storeSettings?.show_logo !== false;
  const footerText = storeSettings?.receipt_footer_note || storeSettings?.receipt_footer_message;

  const isWholesale = invoice.bill_mode === "WHOLESALE";
  const isGst = invoice.invoice_type === "GST";
  const taxAmount = Number(invoice.tax_amount || 0);
  const cgst = taxAmount / 2;
  const sgst = taxAmount / 2;

  const dateStr = new Date(invoice.created_at || Date.now()).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalQty = items.reduce((acc, it) => acc + Number(it.qty || 1), 0);

  // Try loading logo
  let logoImg: HTMLImageElement | null = null;
  if (showLogo && shopLogo) {
    try {
      logoImg = await loadImage(shopLogo);
    } catch {
      logoImg = null;
    }
  }

  // Pre-calculate canvas height based on dynamic content
  // Start with minimum baseline height
  let estimatedHeight = 520;
  if (logoImg) estimatedHeight += 70;
  estimatedHeight += items.length * 28;
  if (isGst && taxAmount > 0) estimatedHeight += 44;
  if (Number(invoice.discount_amount || 0) > 0) estimatedHeight += 22;

  // Create temporary canvas for measuring and rendering
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * scale;
  canvas.height = Math.max(650, estimatedHeight) * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvas.height / scale);

  let y = 18;

  // 1. Logo
  if (logoImg) {
    const logoSize = 56;
    ctx.drawImage(logoImg, centerX - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 10;
  }

  // 2. Shop Name
  ctx.fillStyle = "#000000";
  ctx.font = "900 17px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(shopName, centerX, y);
  y += 24;

  // 3. Shop Tagline Box
  if (shopHeader) {
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    const headerWidth = ctx.measureText(shopHeader).width + 24;
    const boxHeight = 22;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(centerX - headerWidth / 2, y, headerWidth, boxHeight);
    ctx.fillText(shopHeader, centerX, y + 5);
    y += boxHeight + 8;
  }

  // 4. Address & Phone
  if (shopAddress) {
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    const addrLines = wrapLines(ctx, shopAddress, contentWidth);
    addrLines.forEach((line) => {
      ctx.fillText(line, centerX, y);
      y += 16;
    });
  }

  if (shopPhone) {
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    ctx.fillText(`Ph: ${shopPhone}`, centerX, y);
    y += 16;
  }

  if (isGst && shopGstin) {
    ctx.font = "bold 10px 'Courier New', Courier, monospace";
    const gstinText = `GSTIN: ${shopGstin}`;
    const gstinWidth = ctx.measureText(gstinText).width + 12;
    ctx.strokeRect(centerX - gstinWidth / 2, y, gstinWidth, 18);
    ctx.fillText(gstinText, centerX, y + 4);
    y += 24;
  }

  y += 4;

  // Dashed Line
  function drawDashedLine(lineY: number) {
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(leftX, lineY);
    ctx.lineTo(rightX, lineY);
    ctx.stroke();
    ctx.restore();
  }

  function drawSolidLine(lineY: number, width = 1.5) {
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = width;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(leftX, lineY);
    ctx.lineTo(rightX, lineY);
    ctx.stroke();
    ctx.restore();
  }

  drawDashedLine(y);
  y += 10;

  // 5. Invoice Title Banner
  ctx.font = "900 12px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.fillText(isWholesale ? "★ WHOLESALE INVOICE ★" : "— RETAIL INVOICE —", centerX, y);
  y += 18;

  drawDashedLine(y);
  y += 10;

  // 6. Invoice Meta Fields
  function drawMetaRow(label: string, value: string, boldValue = false) {
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.fillText(label, leftX, y);

    ctx.textAlign = "right";
    ctx.font = boldValue ? "900 12px 'Courier New', Courier, monospace" : "bold 11px 'Courier New', Courier, monospace";
    ctx.fillText(value, rightX, y);
    y += 18;
  }

  drawMetaRow(isGst ? "TAX INVOICE" : "CASH BILL", invoice.invoice_number || "MSSP-0000", true);
  drawMetaRow("Date & Time:", dateStr);
  drawMetaRow("Customer:", invoice.customer_name || "Walk-in Customer", true);
  if (invoice.customer_mobile) {
    drawMetaRow("Mobile:", invoice.customer_mobile);
  }
  drawMetaRow("Payment Mode:", (invoice.payment_method || "CASH").toUpperCase(), true);

  y += 2;
  drawSolidLine(y, 2);
  y += 8;

  // 7. Table Headers: ITEM | RATE | QTY | AMT(₹)
  // X positions: Left=leftX, Rate=280 (right), Qty=335 (center), Amt=rightX (right)
  const rateX = rightX - 145;
  const qtyX = rightX - 85;
  const amtX = rightX;

  ctx.font = "900 11px 'Courier New', Courier, monospace";
  ctx.textAlign = "left";
  ctx.fillText("ITEM", leftX, y);

  ctx.textAlign = "right";
  ctx.fillText("RATE", rateX, y);

  ctx.textAlign = "center";
  ctx.fillText("QTY", qtyX, y);

  ctx.textAlign = "right";
  ctx.fillText("AMT(₹)", amtX, y);

  y += 16;
  drawSolidLine(y, 1.5);
  y += 8;

  // 8. Line Items
  const maxItemNameWidth = rateX - leftX - 16;
  if (items && items.length > 0) {
    items.forEach((it: any) => {
      const name = it.product_name || it.name || "Item";
      const unitPrice = Number(it.unit_price || it.price || 0);
      const itemQty = Number(it.qty || 1);
      const totalPrice = Number(it.total_price ?? itemQty * unitPrice);

      ctx.font = "bold 11px 'Courier New', Courier, monospace";
      const nameLines = wrapLines(ctx, name, maxItemNameWidth);

      // Print first line with numbers
      ctx.textAlign = "left";
      ctx.fillText(nameLines[0], leftX, y);

      ctx.textAlign = "right";
      ctx.fillText(unitPrice.toFixed(2), rateX, y);

      ctx.textAlign = "center";
      ctx.fillText(String(itemQty), qtyX, y);

      ctx.textAlign = "right";
      ctx.fillText(totalPrice.toFixed(2), amtX, y);

      y += 16;

      // Print any wrapped item name lines below
      for (let l = 1; l < nameLines.length; l++) {
        ctx.textAlign = "left";
        ctx.fillText(nameLines[l], leftX, y);
        y += 16;
      }
    });
  } else {
    ctx.textAlign = "center";
    ctx.font = "bold 11px 'Courier New', Courier, monospace";
    ctx.fillText("No line items attached.", centerX, y);
    y += 18;
  }

  y += 2;
  drawSolidLine(y, 1.5);
  y += 10;

  // 9. Financial Summary
  function drawSummaryRow(label: string, value: string, isBold = false) {
    ctx.font = isBold ? "900 12px 'Courier New', Courier, monospace" : "bold 11px 'Courier New', Courier, monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.fillText(label, leftX, y);

    ctx.textAlign = "right";
    ctx.fillText(value, rightX, y);
    y += 17;
  }

  drawSummaryRow("Total Items:", `${items.length} items (${totalQty} pcs)`);
  drawSummaryRow("Subtotal:", `₹${Number(invoice.subtotal || 0).toFixed(2)}`, true);

  if (Number(invoice.discount_amount || 0) > 0) {
    drawSummaryRow("Discount (-):", `-₹${Number(invoice.discount_amount).toFixed(2)}`);
  }

  if (Number(invoice.exchange_amount || 0) > 0) {
    drawSummaryRow("Exchange (-):", `-₹${Number(invoice.exchange_amount).toFixed(2)}`);
  }

  if (isGst && taxAmount > 0) {
    drawSummaryRow("CGST:", `₹${cgst.toFixed(2)}`);
    drawSummaryRow("SGST:", `₹${sgst.toFixed(2)}`);
  }

  y += 4;
  drawSolidLine(y, 2);
  y += 10;

  // 10. Grand Total Box (Solid Black Background with Crisp White Text)
  const boxHeight = 44;
  ctx.fillStyle = "#000000";
  ctx.fillRect(leftX, y, contentWidth, boxHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 14px 'Courier New', Courier, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("NET AMOUNT:", leftX + 14, y + boxHeight / 2);

  ctx.font = "900 20px 'Courier New', Courier, monospace";
  ctx.textAlign = "right";
  ctx.fillText(`₹${Number(invoice.grand_total || 0).toFixed(2)}`, rightX - 14, y + boxHeight / 2);

  y += boxHeight + 14;

  // 11. Barcode
  const barcodeValue = invoice.invoice_number || "INV-0000";
  const barcodeWidth = 240;
  const barcodeHeight = 34;
  const barcodeLeft = centerX - barcodeWidth / 2;

  // Draw deterministic barcode lines
  let curX = barcodeLeft + 8;
  const maxWidth = barcodeLeft + barcodeWidth - 8;
  ctx.fillStyle = "#000000";

  for (let i = 0; i < barcodeValue.length && curX < maxWidth; i++) {
    const code = barcodeValue.charCodeAt(i);
    const w1 = (code % 3) + 1.2;
    const gap = ((code * 7) % 3) + 1.8;
    const w2 = ((code * 13) % 2) + 1.2;

    ctx.fillRect(curX, y, w1, barcodeHeight);
    curX += w1 + gap;
    if (curX >= maxWidth) break;
    ctx.fillRect(curX, y, w2, barcodeHeight);
    curX += w2 + 2.2;
  }

  y += barcodeHeight + 4;
  ctx.font = "bold 10px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#000000";
  ctx.fillText(`*${barcodeValue}*`, centerX, y);

  y += 18;
  drawDashedLine(y);
  y += 12;

  // 12. Footer & Policy
  ctx.font = "bold 10px 'Courier New', Courier, monospace";
  ctx.textAlign = "center";
  if (footerText) {
    const footLines = wrapLines(ctx, footerText, contentWidth);
    footLines.forEach((line) => {
      ctx.fillText(line, centerX, y);
      y += 15;
    });
  } else {
    ctx.font = "900 11px 'Courier New', Courier, monospace";
    ctx.fillText("*** Thank You For Your Business! ***", centerX, y);
    y += 16;

    ctx.font = "bold 10px 'Courier New', Courier, monospace";
    ctx.fillText("Goods once sold can be exchanged within 7 days.", centerX, y);
    y += 15;
    ctx.fillText("Please retain this bill for warranty & service.", centerX, y);
    y += 16;

    ctx.font = "900 10px 'Courier New', Courier, monospace";
    ctx.fillText(`${shopName} • ${shopHeader || "WHOLESALE SHOP"}`, centerX, y);
    y += 16;
  }

  y += 12;

  // Trim canvas to actual rendered height
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = canvasWidth * scale;
  finalCanvas.height = Math.ceil(y * scale);
  const finalCtx = finalCanvas.getContext("2d");
  if (finalCtx) {
    finalCtx.drawImage(
      canvas,
      0,
      0,
      finalCanvas.width,
      finalCanvas.height,
      0,
      0,
      finalCanvas.width,
      finalCanvas.height
    );
    return finalCanvas;
  }

  return canvas;
}

/**
 * Returns a PNG data URL of the rendered thermal receipt canvas
 */
export async function renderThermalReceiptToDataUrl(
  invoice: Invoice,
  items: InvoiceItem[] = [],
  storeSettings?: Record<string, any>
): Promise<string> {
  const canvas = await renderThermalReceiptToCanvas(invoice, items, storeSettings);
  return canvas.toDataURL("image/png");
}
