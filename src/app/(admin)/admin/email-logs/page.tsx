"use client";

import React, { useEffect, useState } from "react";
import { Mail, RefreshCw, ArrowUpRight, ArrowDownLeft, Shield } from "lucide-react";

interface EmailLogEntry {
  id: string;
  timestamp: string;
  sender: string;
  recipient: string;
  domain: string;
  status: "DELIVERED" | "DEFERRED" | "BOUNCED" | "QUEUED";
  direction: "INBOUND" | "OUTBOUND";
  messageId: string;
  server: string;
  responseCode: string;
}

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/email-logs");
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Mail Delivery & Transaction Logs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Postfix delivery telemetry, SMTP handshakes, deferred queues, and delivery statuses.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Email Delivery Activity</h3>
          </div>
          <span className="text-xs text-slate-400">{logs.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[11px] font-sans font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Flow</th>
                <th className="px-6 py-3">Sender</th>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Server</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Postfix Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="px-6 py-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.direction === "OUTBOUND"
                          ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {log.direction === "OUTBOUND" ? (
                        <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                      ) : (
                        <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                      )}
                      <span>{log.direction}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-200">{log.sender}</td>
                  <td className="px-6 py-3 text-slate-300">{log.recipient}</td>
                  <td className="px-6 py-3 text-slate-400 font-bold">{log.server}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === "DELIVERED"
                          ? "bg-emerald-950 text-emerald-300"
                          : log.status === "DEFERRED"
                          ? "bg-amber-950 text-amber-300"
                          : "bg-rose-950 text-rose-300"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[11px] text-slate-400 truncate max-w-xs">
                    {log.responseCode}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
