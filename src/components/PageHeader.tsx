import React from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
      <div>
        <h1 className="text-xl font-black tracking-tight text-[#1B2D6B]">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[#64748B] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

