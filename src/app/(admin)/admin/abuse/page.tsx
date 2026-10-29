"use client";

import React, { useState } from "react";
import { ShieldAlert, AlertTriangle, Lock, CheckCircle2, Search } from "lucide-react";

export default function AdminAbusePage() {
  const [activeTab, setActiveTab] = useState<"alerts" | "thresholds">("alerts");
  const [suspendTarget, setSuspendTarget] = useState("");
  const [suspendType, setSuspendType] = useState<"organization" | "mailbox">("organization");
  const [suspendReason, setSuspendReason] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mockIncidents = [
    {
      id: "INC-101",
      type: "High Outbound Rate",
      target: "spammer-test@democorp.com",
      organization: "Demo Corp",
      details: "Attempted 450 emails in 10 minutes (Rate threshold: 500/day)",
      severity: "MEDIUM",
      status: "MONITORED",
    },
    {
      id: "INC-102",
      type: "Failed Authentication Spikes",
      target: "ceo@democorp.com",
      organization: "Demo Corp",
      details: "8 consecutive failed SMTP AUTH attempts from IP 198.51.100.99",
      severity: "HIGH",
      status: "BLOCKED",
    },
  ];

  const handleManualSuspension = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      const payload =
        suspendType === "mailbox"
          ? {
              action: "SUSPEND_MAILBOX",
              mailboxEmail: suspendTarget.trim(),
              reason: suspendReason.trim(),
            }
          : {
              action: "SUSPEND_ORGANIZATION",
              target: suspendTarget.trim(),
              reason: suspendReason.trim(),
            };

      const res = await fetch("/api/v1/admin/abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Suspension failed.");
      }
      setStatusMessage(data.message || `Suspended ${suspendType}: ${suspendTarget}.`);
      setSuspendTarget("");
      setSuspendReason("");
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : "Suspension request failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security & Abuse Prevention Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor outbound spam anomalies, failed authentication spikes, enforce rate limits, and suspend compromised accounts.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Manual Containment Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-white mb-3">Instant Abuse Containment Action</h2>
        <form onSubmit={handleManualSuspension} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Type</label>
            <select
              value={suspendType}
              onChange={(e) => setSuspendType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            >
              <option value="organization">Customer Organization (Slug/ID)</option>
              <option value="mailbox">Specific Mailbox (Email Address)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Identifier</label>
            <input
              type="text"
              placeholder={suspendType === "mailbox" ? "user@domain.com" : "org-slug"}
              required
              value={suspendTarget}
              onChange={(e) => setSuspendTarget(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Reason / Abuse Ticket #</label>
            <input
              type="text"
              placeholder="e.g. Spam complaint from Spamhaus"
              required
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-xs transition-colors"
            >
              Suspend Immediately
            </button>
          </div>
        </form>
      </div>

      {/* Flagged Incidents */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Recent Abuse & Deliverability Alerts</h3>
          </div>
          <span className="text-xs text-slate-400">{mockIncidents.length} events</span>
        </div>

        <div className="divide-y divide-slate-800">
          {mockIncidents.map((inc) => (
            <div key={inc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-400">{inc.id}</span>
                  <span className="text-sm font-bold text-white">{inc.type}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      inc.severity === "HIGH" ? "bg-rose-950 text-rose-300" : "bg-amber-950 text-amber-300"
                    }`}
                  >
                    {inc.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Target: <span className="font-mono text-amber-300">{inc.target}</span> ({inc.organization})
                </p>
                <p className="text-xs text-slate-400">{inc.details}</p>
              </div>

              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono bg-slate-950 text-slate-300 border border-slate-800">
                {inc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
