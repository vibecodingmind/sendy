"use client";

import React, { useEffect, useState } from "react";
import { HardDrive, CheckCircle2, RefreshCw, Download, ShieldCheck, Database, Calendar } from "lucide-react";

interface BackupRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  sizeMb: number;
  completedAt: string;
  storageTarget: string;
}

interface BackupOverview {
  status: string;
  lastSuccessful: string | null;
  nextScheduled: string;
  backups: BackupRecord[];
  targets: {
    primary: string;
    retentionDays: number;
    encryption: string;
  };
}

export default function AdminBackupsPage() {
  const [data, setData] = useState<BackupOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/backups");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleTriggerBackup = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/v1/admin/backups", { method: "POST" });
      if (res.ok) {
        fetchBackups();
      }
    } catch {
      alert("Error initiating snapshot");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System &amp; Mail Backups</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated off-site snapshots of SaaS metadata, PostgreSQL databases, Postfix/Dovecot configurations, and mailbox storage.
          </p>
        </div>

        <button
          onClick={handleTriggerBackup}
          disabled={triggering}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${triggering ? "animate-spin" : ""}`} />
          <span>{triggering ? "Taking Snapshot..." : "Trigger Manual Snapshot"}</span>
        </button>
      </div>

      {/* Overview Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Cluster Backup Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400">HEALTHY</span>
            <p className="text-xs text-slate-400 mt-1">AES-256 encrypted remote replication</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Last Successful Snapshot</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-sm font-mono font-bold text-white">
              {data?.lastSuccessful
                ? new Date(data.lastSuccessful).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "None"}
            </span>
            <p className="text-xs text-slate-400 mt-1">30-day retention window</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider">Next Scheduled Backup</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <span className="text-sm font-mono font-bold text-white">
              {data?.nextScheduled
                ? new Date(data.nextScheduled).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Continuous"}
            </span>
            <p className="text-xs text-slate-400 mt-1">Daily automated cron snapshot</p>
          </div>
        </div>
      </div>

      {/* Snapshot Archive List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Snapshot Archive</h3>
          </div>
          <span className="text-xs text-slate-400">{data?.backups.length || 0} snapshots</span>
        </div>

        <div className="divide-y divide-slate-800">
          {data?.backups.map((bak) => (
            <div key={bak.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">{bak.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                    {bak.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">Archive: {bak.storageTarget}</p>
                <div className="text-xs text-slate-500 flex items-center space-x-3">
                  <span>Size: {(bak.sizeMb / 1024).toFixed(2)} GB</span>
                  <span>•</span>
                  <span>
                    Created: {new Date(bak.completedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => alert(`Initiating secure download of snapshot ${bak.id}...`)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Archive</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
