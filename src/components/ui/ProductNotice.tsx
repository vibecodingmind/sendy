"use client";

import React from "react";
import { Info, X } from "lucide-react";

interface ProductNoticeProps {
  id: string;
  title: string;
  message: string;
  variant?: "info" | "warning";
}

export function ProductNotice({ id, title, message, variant = "info" }: ProductNoticeProps) {
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(`notice_${id}`) === "1") {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  if (dismissed) return null;

  const styles =
    variant === "warning"
      ? "bg-amber-50 border-amber-200 text-amber-950"
      : "bg-cyan-50 border-cyan-200 text-cyan-950";

  return (
    <div className={`rounded-xl border px-4 py-3 flex gap-3 items-start text-sm ${styles}`}>
      <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{message}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        className="p-1 rounded-lg hover:bg-black/5"
        onClick={() => {
          try {
            localStorage.setItem(`notice_${id}`, "1");
          } catch {}
          setDismissed(true);
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
