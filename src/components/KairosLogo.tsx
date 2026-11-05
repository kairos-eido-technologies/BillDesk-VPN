import React from "react";

interface KairosLogoProps {
  variant?: "color" | "bw" | "icon";
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Kairos Bills Brand Logo Component
 * Displays the modern stylized blue K with ₹ receipt invoice monogram.
 */
export function KairosLogo({
  variant = "color",
  className = "",
  style,
  showText = true,
  size = "md",
}: KairosLogoProps) {
  const iconHeightClass =
    size === "sm" ? "h-8" : size === "lg" ? "h-14" : size === "xl" ? "h-20" : "h-10";

  if (variant === "icon" || !showText) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
        <img
          src="/kairos-bills-logo.png"
          alt="Kairos Bills Logo"
          className={`${iconHeightClass} w-auto object-contain rounded-lg shrink-0`}
        />
      </div>
    );
  }

  if (variant === "bw") {
    return (
      <div className={`flex flex-col items-center justify-center text-center text-black shrink-0 ${className}`} style={style}>
        <img
          src="/kairos-bills-logo.png"
          alt="Kairos Bills Logo"
          className={`${iconHeightClass} w-auto object-contain mx-auto mb-1 grayscale contrast-200 shrink-0`}
        />
        <div className="font-sans font-black text-sm tracking-wider uppercase text-black leading-none">
          KAIROS BILLS
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`} style={style}>
      <img
        src="/kairos-bills-logo.png"
        alt="Kairos Bills Logo"
        className={`${iconHeightClass} w-auto object-contain rounded-lg shrink-0 shadow-sm`}
      />
      {showText && (
        <div className="flex flex-col text-left leading-none shrink-0">
          <span className="font-sans font-black text-foreground tracking-tight text-base sm:text-lg leading-tight flex items-center gap-1">
            <span className="text-primary font-black">Kairos</span> Bills
          </span>
          <span className="text-[9px] font-mono font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
            Smart Cloud Billing & Ledger
          </span>
        </div>
      )}
    </div>
  );
}

// Backward compatibility alias
export const PonmaniLogo = KairosLogo;
