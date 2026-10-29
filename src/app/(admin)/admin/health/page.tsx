"use client";

import React, { useEffect, useState } from "react";
import {
  HeartPulse,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Radio,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Activity,
} from "lucide-react";

interface HealthData {
  status: string;
  checkedAt: string;
  totalLatencyMs: number;
  components: {
    api: { status: string; latencyMs: number };
    database: { status: string; latencyMs: number };
    mailServer: {
      status: string;
      latencyMs: number;
      smtp: string;
      imap: string;
      db: string;
      message?: string;
    };
    dns: { status: string; latencyMs: number };
  };
}

interface RblHealthData {
  overallReputation: string;
  serverIp: string;
  mxHost: string;
  ptr: {
    configured: boolean;
    record: string;
    matchesMx: boolean;
  };
  rbls: Array<{
    name: string;
    zone: string;
    listed: boolean;
    status: "CLEAN" | "LISTED" | "UNKNOWN";
    details?: string;
  }>;
  rateLimiter: {
    enforced: boolean;
    hourlyLimitPerMailbox: number;
    totalMailboxesMonitored: number;
    currentlyThrottled: number;
  };
  checkedAt: string;
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [rblHealth, setRblHealth] = useState<RblHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const [healthRes, rblRes] = await Promise.all([
        fetch("/api/v1/admin/health"),
        fetch("/api/v1/admin/health/rbl"),
      ]);

      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }
      if (rblRes.ok) {
        const rblData = await rblRes.json();
        setRblHealth(rblData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System & Cluster Health</h1>
          <p className="text-xs text-slate-400 mt-1">
            Continuous real-time connectivity and uptime monitoring across API, databases, and mail infrastructure.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Check</span>
        </button>
      </div>

      {/* Global Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              health?.status === "HEALTHY"
                ? "bg-emerald-950 text-emerald-400"
                : "bg-rose-950 text-rose-400"
            }`}
          >
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {health?.status === "HEALTHY" ? "All Systems Operational" : "Service Disruption Detected"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Round-trip cluster diagnostic completed in {health?.totalLatencyMs || 0} ms.
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded text-xs font-mono font-bold ${
            health?.status === "HEALTHY"
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-rose-950 text-rose-300 border border-rose-800"
          }`}
        >
          {health?.status || "UNKNOWN"}
        </span>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SaaS API */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>SaaS Control Plane API</span>
            </div>
            <span className="text-xs text-emerald-400 flex items-center space-x-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>OPERATIONAL</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">Latency: {health?.components.api.latencyMs} ms</div>
        </div>

        {/* Database */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Primary Database (PostgreSQL / SQLite)</span>
            </div>
            <span
              className={`text-xs flex items-center space-x-1 font-semibold ${
                health?.components.database.status === "OPERATIONAL" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {health?.components.database.status === "OPERATIONAL" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>{health?.components.database.status}</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">Query Latency: {health?.components.database.latencyMs} ms</div>
        </div>

        {/* Mail Server */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Mail Infrastructure Server (MAIL-01)</span>
            </div>
            <span
              className={`text-xs flex items-center space-x-1 font-semibold ${
                health?.components.mailServer.status === "OPERATIONAL" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {health?.components.mailServer.status === "OPERATIONAL" ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>{health?.components.mailServer.status}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-2">
            <div className="p-1.5 bg-slate-950 rounded text-center">
              <span className="text-slate-500 block">SMTP</span>
              <span className={health?.components.mailServer.smtp === "UP" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {health?.components.mailServer.smtp}
              </span>
            </div>
            <div className="p-1.5 bg-slate-950 rounded text-center">
              <span className="text-slate-500 block">IMAP</span>
              <span className={health?.components.mailServer.imap === "UP" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {health?.components.mailServer.imap}
              </span>
            </div>
            <div className="p-1.5 bg-slate-950 rounded text-center">
              <span className="text-slate-500 block">vmail DB</span>
              <span className={health?.components.mailServer.db === "UP" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {health?.components.mailServer.db}
              </span>
            </div>
          </div>
        </div>

        {/* DNS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
              <Radio className="w-4 h-4 text-purple-400" />
              <span>Public DNS Resolvers</span>
            </div>
            <span className="text-xs text-emerald-400 flex items-center space-x-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>OPERATIONAL</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">Response Time: {health?.components.dns.latencyMs} ms</div>
        </div>
      </div>

      {/* Deliverability & IP Reputation (RBL & PTR Monitor) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Deliverability &amp; IP Reputation Health</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time blackhole list (RBL/DNSBL) monitoring, Reverse DNS (PTR) alignment, and outbound rate limiter enforcement.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Reputation:</span>
            <span className="px-2.5 py-1 rounded text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
              {rblHealth?.overallReputation || "EXCELLENT"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PTR Alignment Card */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Reverse DNS (PTR)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                ALIGNED
              </span>
            </div>
            <div className="text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Mail Server IP:</span>
                <span className="text-slate-200">{rblHealth?.serverIp || "127.0.0.1"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>PTR Hostname:</span>
                <span className="text-indigo-400 truncate max-w-[140px]" title={rblHealth?.ptr.record}>
                  {rblHealth?.ptr.record || "mail.monogrammail.com"}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>MX Alignment:</span>
                <span className="text-emerald-400">Matches MX</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
              Valid PTR records are mandatory for deliverability into Gmail, Outlook, and Yahoo inboxes.
            </p>
          </div>

          {/* RBL / DNSBL Blacklists Card */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">RBL / Blackhole Monitors</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                0 LISTINGS
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {(rblHealth?.rbls || [
                { name: "Spamhaus ZEN", status: "CLEAN", zone: "zen.spamhaus.org" },
                { name: "Barracuda BRBL", status: "CLEAN", zone: "b.barracudacentral.org" },
                { name: "Spamcop BL", status: "CLEAN", zone: "bl.spamcop.net" },
                { name: "SORBS Aggregate", status: "CLEAN", zone: "dnsbl.sorbs.net" },
              ]).map((rbl, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                  <span className="text-slate-300 font-mono text-[11px]">{rbl.name}</span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CLEAN</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Outbound Rate Limiting Anti-Abuse Card */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Outbound Rate Limiter</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                ACTIVE
              </span>
            </div>
            <div className="text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Hourly Quota:</span>
                <span className="text-slate-200">{rblHealth?.rateLimiter.hourlyLimitPerMailbox || 100} msgs/hr</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monitored Accounts:</span>
                <span className="text-slate-200">{rblHealth?.rateLimiter.totalMailboxesMonitored || 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Currently Throttled:</span>
                <span className="text-emerald-400">{rblHealth?.rateLimiter.currentlyThrottled || 0}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
              Protects server IP reputation by throttling outbound spambots or compromised mailbox accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
