import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  className = "",
}: PaginationControlsProps) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2.5 bg-secondary/30 border-t border-border text-xs ${className}`}
    >
      <div className="text-muted-foreground font-mono text-[11px]">
        Showing <span className="font-bold text-foreground">{startItem}</span> to{" "}
        <span className="font-bold text-foreground">{endItem}</span> of{" "}
        <span className="font-bold text-foreground">{totalItems}</span> ({pageSize} per page)
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 px-2.5 rounded-lg bg-card border border-border hover:bg-muted text-foreground font-semibold flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Prev</span>
        </button>

        <span className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold font-mono text-[11px]">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 px-2.5 rounded-lg bg-card border border-border hover:bg-muted text-foreground font-semibold flex items-center gap-1 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

