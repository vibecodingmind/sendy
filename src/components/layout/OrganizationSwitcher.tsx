"use client";

import React, { useState } from "react";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationSwitcherProps {
  organizations: OrgOption[];
  activeOrganizationId?: string | null;
  compact?: boolean;
  dark?: boolean;
}

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
  compact = false,
  dark = false,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (organizations.length <= 1) {
    const org = organizations[0];
    if (!org) return null;
    return (
      <div
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          dark
            ? "bg-slate-900 border-slate-800 text-slate-300"
            : "bg-slate-50 border-slate-200/80 text-slate-700 shadow-2xs"
        }`}
      >
        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
        <span className={compact ? "max-w-[100px] truncate" : "max-w-[140px] truncate"}>{org.name}</span>
      </div>
    );
  }

  const active =
    organizations.find((o) => o.id === activeOrganizationId) || organizations[0];

  const switchOrg = async (organizationId: string) => {
    if (organizationId === active.id || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/v1/auth/switch-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
        window.location.assign("/dashboard");
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={switching}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
          dark
            ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600"
            : "bg-slate-50 border-slate-200/80 text-slate-700 shadow-2xs hover:border-slate-300"
        }`}
      >
        {switching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
        ) : (
          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
        )}
        <span className={compact ? "max-w-[100px] truncate" : "max-w-[140px] truncate"}>
          {active.name}
        </span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close organization menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50 py-1 text-xs">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Switch organization
            </p>
            {organizations.map((org) => {
              const isActive = org.id === active.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => switchOrg(org.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 ${
                    isActive ? "text-indigo-700 font-semibold" : "text-slate-700"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
