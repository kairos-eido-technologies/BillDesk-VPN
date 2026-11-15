import React from "react";

/**
 * ============================================================================
 * ISO/IEC 15417 Standard Code 128 (Code Set B) Barcode Encoder
 * ============================================================================
 * 
 * 100% Offline, Zero external library dependency, High Density,
 * Fully compatible with all 1D / 2D laser and optical barcode scanners.
 */

// Official 107 Code 128 bar-space width patterns (Index 0 to 106)
// Each digit represents the width of an alternating bar or space in modules.
// Symbols 0 to 105 have 6 digits (sum = 11 modules). Symbol 106 (Stop) has 7 digits (sum = 13 modules).
const CODE128_PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0 - 9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10 - 19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20 - 29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30 - 39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40 - 49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50 - 59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60 - 69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70 - 79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80 - 89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90 - 99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                               // 100 - 106
];

const START_B = 104;
const STOP = 106;

export interface Code128Bar {
  x: number;
  width: number;
}

export interface EncodedCode128 {
  totalModules: number;
  bars: Code128Bar[];
  text: string;
}

/**
 * Encodes an ASCII string into standard ISO/IEC 15417 Code 128 (Subset B)
 * including Start B, data symbols, Modulo-103 checksum, and Stop symbol.
 */
export function encodeCode128(text: string, quietZoneModules = 10): EncodedCode128 {
  const safeText = String(text || "").trim();
  const symbolIndices: number[] = [START_B];

  let checksumAcc = START_B;

  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i);
    // Code Set B supports ASCII 32 (' ') to 126 ('~')
    const val = charCode >= 32 && charCode <= 126 ? charCode - 32 : 0;
    symbolIndices.push(val);
    checksumAcc += val * (i + 1);
  }

  const checksumVal = checksumAcc % 103;
  symbolIndices.push(checksumVal);
  symbolIndices.push(STOP);

  // Convert symbol pattern sequence into bar coordinates
  const bars: Code128Bar[] = [];
  let curModule = quietZoneModules;

  for (const symIndex of symbolIndices) {
    const pattern = CODE128_PATTERNS[symIndex];
    if (!pattern) continue;

    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      const isBar = p % 2 === 0; // Even indices are bars (black), odd are spaces (white)

      if (isBar) {
        bars.push({ x: curModule, width });
      }
      curModule += width;
    }
  }

  const totalModules = curModule + quietZoneModules;
  return { totalModules, bars, text: safeText };
}

/**
 * Generates an SVG string of a Code 128 barcode ready for HTML injection / printing
 */
export function generateCode128Svg(
  text: string,
  options?: {
    height?: number;
    maxW?: string;
    quietZone?: number;
    barColor?: string;
    bgColor?: string;
  }
): string {
  const height = options?.height ?? 22;
  const maxW = options?.maxW ?? "140px";
  const quietZone = options?.quietZone ?? 8;
  const barColor = options?.barColor ?? "#000000";
  const bgColor = options?.bgColor ?? "#ffffff";

  const { totalModules, bars } = encodeCode128(text, quietZone);

  const rects = bars
    .map(
      (b) => `<rect x="${b.x}" y="0" width="${b.width}" height="${height}" fill="${barColor}" />`
    )
    .join("");

  return `<svg style="width: 100%; height: ${height}px; max-width: ${maxW}; display: block; margin: 0 auto;" viewBox="0 0 ${totalModules} ${height}" preserveAspectRatio="none"><rect width="${totalModules}" height="${height}" fill="${bgColor}" />${rects}</svg>`;
}

/**
 * React Component for live Code 128 barcode visual display
 */
export function Code128Visual({
  code,
  height = 22,
  maxW = "140px",
  className = "",
}: {
  code: string;
  height?: number;
  maxW?: string;
  className?: string;
}) {
  const { totalModules, bars } = encodeCode128(code, 8);

  return (
    <svg
      className={`w-full ${className}`}
      style={{ height: `${height}px`, maxWidth: maxW }}
      viewBox={`0 0 ${totalModules} ${height}`}
      preserveAspectRatio="none"
    >
      <rect width={totalModules} height={height} fill="#ffffff" />
      {bars.map((b, idx) => (
        <rect key={idx} x={b.x} y="0" width={b.width} height={height} fill="#000000" />
      ))}
    </svg>
  );
}

/**
 * Draws a standard Code 128 barcode directly onto a Canvas context (for receipts, WhatsApp sharing)
 */
export function drawCode128ToCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  quietZone = 8
): void {
  const { totalModules, bars } = encodeCode128(text, quietZone);
  const scale = width / totalModules;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#000000";
  for (const bar of bars) {
    ctx.fillRect(x + bar.x * scale, y, bar.width * scale, height);
  }
  ctx.restore();
}

