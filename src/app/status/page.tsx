"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";

interface StatusPayload {
  status: string;
  components: {
    controlPlane: string;
    mailInfrastructure: string;
  };
  latencyMs: number;
  updatedAt: string;
}

function tone(status: string) {
  if (status === "operational") return "text-emerald-600";
  if (status === "outage" || status === "offline") return "text-rose-600";
  return "text-amber-600";
}

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState(false);

  const load = () => {
    fetch("/api/v1/status")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen surface-app">
      <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Monogram Mail
        </Link>

        <div className="surface-card p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title">System status</h1>
              <p className="page-subtitle">Public control plane and mail infrastructure health</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4" />
              Unable to load status. Retry shortly.
            </div>
          )}

          {data && (
            <>
              <div className="flex items-center gap-2">
                {data.status === "operational" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
                <span className={`text-xl font-bold capitalize ${tone(data.status)}`}>{data.status}</span>
              </div>

              <ul className="space-y-3 text-sm">
                <li className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Control plane (API & database)</span>
                  <span className={`font-semibold capitalize ${tone(data.components.controlPlane)}`}>
                    {data.components.controlPlane}
                  </span>
                </li>
                <li className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-600">Mail infrastructure</span>
                  <span className={`font-semibold capitalize ${tone(data.components.mailInfrastructure)}`}>
                    {data.components.mailInfrastructure}
                  </span>
                </li>
              </ul>

              <p className="text-xs text-slate-400">
                Updated {new Date(data.updatedAt).toLocaleString()} · probe {data.latencyMs}ms · refreshes every 60s
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
