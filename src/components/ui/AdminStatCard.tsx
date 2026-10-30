import React from "react";
import { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "amber" | "emerald" | "sky" | "violet" | "rose";
  footer?: React.ReactNode;
}

const accentMap = {
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "amber",
  footer,
}: AdminStatCardProps) {
  return (
    <div className="admin-card p-5 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="admin-stat-value mt-1">{value}</p>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
        </div>
        <div
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${accentMap[accent]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {footer}
    </div>
  );
}
