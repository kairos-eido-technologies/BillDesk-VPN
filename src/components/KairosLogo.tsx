import React from "react";

interface MSSLogoProps {
  variant?: "color" | "bw" | "icon";
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * MSS Ponkumar Store Brand Logo Component
 * Displays the official MSS shopping bag logo with Navy Blue & Red palette.
 */
export function MSSLogo({
  variant = "color",
  className = "",
  style,
  showText = true,
  size = "md",
}: MSSLogoProps) {
  const iconHeightClass =
    size === "sm" ? "h-8" : size === "lg" ? "h-16" : size === "xl" ? "h-24" : "h-11";

  if (variant === "icon" || !showText) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
        <img
          src="/mss-logo.png"
          alt="MSS Ponkumar Store Logo"
          className={`${iconHeightClass} w-auto object-contain rounded-xl shrink-0 shadow-sm`}
        />
      </div>
    );
  }

  if (variant === "bw") {
    return (
      <div className={`flex flex-col items-center justify-center text-center text-black shrink-0 ${className}`} style={style}>
        <img
          src="/mss-logo.png"
          alt="MSS Ponkumar Store Logo"
          className={`${iconHeightClass} w-auto object-contain mx-auto mb-1 grayscale contrast-200 shrink-0`}
        />
        <div className="font-sans font-black text-sm tracking-wider uppercase text-black leading-none">
          MSS PONKUMAR STORE
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-black mt-0.5">
          WHOLESALE SHOP
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`} style={style}>
      <img
        src="/mss-logo.png"
        alt="MSS Ponkumar Store Logo"
        className={`${iconHeightClass} w-auto object-contain rounded-xl shrink-0 shadow-sm border border-slate-200 bg-white`}
      />
      {showText && (
        <div className="flex flex-col text-left leading-none shrink-0">
          <span className="font-sans font-black text-[#1B2D6B] tracking-tight text-base sm:text-lg leading-tight flex items-center gap-1.5">
            <span>MSS Ponkumar Store</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E8151B] text-white">
              WHOLESALE
            </span>
          </span>
          <span className="text-[10px] font-bold text-[#E8151B] uppercase tracking-wider mt-1">
            Whole Sale Shop · BillDesk POS
          </span>
        </div>
      )}
    </div>
  );
}

// Backward compatibility aliases
export const KairosLogo = MSSLogo;
export const PonmaniLogo = MSSLogo;
