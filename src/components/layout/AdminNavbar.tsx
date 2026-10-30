"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Activity, ArrowLeft } from "lucide-react";

interface AuthUser {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export function AdminNavbar({ appName = "Monogram Mail" }: { appName?: string }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.email?.split("@")[0] || "Admin";

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 border-b border-slate-800/80 bg-ink-950/90 backdrop-blur-md">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-ink-950 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-white tracking-tight">
                {appName}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
                Admin
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Control plane · infrastructure</p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/status"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-600"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          Status
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Customer portal</span>
        </Link>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block text-right">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{displayName}</p>
            <p className="text-[10px] text-amber-500/90 font-mono">SUPER_ADMIN</p>
          </div>
        </div>
      </div>
    </header>
  );
}
