"use client";

import React, { useEffect, useState } from "react";
import { FileText, RefreshCw, Filter } from "lucide-react";

interface AuditLogItem {
  id: string;
  actorId?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  createdAt: string;
  metadata?: string;
  organization?: { name: string; slug: string };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Audit Logs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable, append-only security log records documenting all administrative and provisioning events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-200">System Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400">{logs.length} entries</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[11px] font-sans font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(log.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3 font-bold text-amber-300">{log.action}</td>
                    <td className="px-6 py-3 text-slate-400">{log.actorRole || "SYSTEM"}</td>
                    <td className="px-6 py-3 text-slate-300">{log.organization?.name || "Global"}</td>
                    <td className="px-6 py-3 text-slate-400">{log.resourceType}</td>
                    <td className="px-6 py-3 text-[11px] text-slate-400 truncate max-w-xs">
                      {log.metadata || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
