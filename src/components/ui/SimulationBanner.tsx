import React from "react";
import { FlaskConical } from "lucide-react";

export function SimulationBanner({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3 items-start text-sm text-amber-100">
      <FlaskConical className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
      <div>
        <p className="font-semibold text-amber-200">Simulation — not production data</p>
        <p className="text-xs mt-0.5 text-amber-100/80 leading-relaxed">
          {feature} is placeholder UI until the real backend is connected. Do not use for operations
          decisions.
        </p>
      </div>
    </div>
  );
}
