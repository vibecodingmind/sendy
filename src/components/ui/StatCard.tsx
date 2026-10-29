import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "brand";
  footer?: React.ReactNode;
}

const toneStyles = {
  default: "from-slate-500/10 to-transparent text-slate-600",
  warning: "from-amber-500/15 to-transparent text-amber-700",
  success: "from-emerald-500/15 to-transparent text-emerald-700",
  brand: "from-brand-500/15 to-transparent text-brand-700",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  footer,
}: StatCardProps) {
  return (
    <div className="surface-card-elevated p-5 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${toneStyles[tone]} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {footer}
    </div>
  );
}
