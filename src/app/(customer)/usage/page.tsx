"use client";

import React, { useEffect, useState } from "react";
import { HardDrive, Mail, Globe, AlertTriangle } from "lucide-react";

interface UsageData {
  summary: {
    totalUsedBytes: number;
    totalUsedGb: number;
    maxStorageGb: number;
    overallPercent: number;
    totalDomains: number;
    maxDomains: number;
    totalMailboxes: number;
    maxMailboxes: number;
  };
  domains: Array<{ id: string; name: string; isVerified: boolean }>;
  mailboxes: Array<{
    id: string;
    email: string;
    usedBytes: number;
    usedMb: number;
    limitMb: number;
    percent: number;
    status: string;
  }>;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading usage metrics...</div>;
  }

  const summary = data?.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Resource Usage & Metrics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor your organization's storage volume, mailbox allocations, and domain limits in real time.
        </p>
      </div>

      {/* Primary Storage Bar Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">Total Email Storage</h3>
          </div>
          <span className="text-sm font-bold text-slate-800">
            {summary?.totalUsedGb} GB of {summary?.maxStorageGb} GB ({summary?.overallPercent}%)
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              (summary?.overallPercent || 0) > 85
                ? "bg-rose-500"
                : (summary?.overallPercent || 0) > 65
                ? "bg-amber-500"
                : "bg-indigo-600"
            }`}
            style={{ width: `${summary?.overallPercent || 0}%` }}
          />
        </div>

        <p className="text-xs text-slate-500">
          Storage encompasses all stored IMAP folders, incoming/sent emails, and attachments across your organization.
        </p>
      </div>

      {/* Limit Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Mailbox Slots</span>
            <Mail className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {summary?.totalMailboxes} / {summary?.maxMailboxes}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {(summary?.maxMailboxes || 0) - (summary?.totalMailboxes || 0)} available to provision
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">Domain Slots</span>
            <Globe className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">
            {summary?.totalDomains} / {summary?.maxDomains}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {(summary?.maxDomains || 0) - (summary?.totalDomains || 0)} custom domains available
          </p>
        </div>
      </div>

      {/* Per-Mailbox Storage Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Per-Mailbox Storage Allocation</h3>
          <span className="text-xs text-slate-400 font-medium">{data?.mailboxes.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Used Storage</th>
                <th className="px-6 py-3">Quota Bar</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.mailboxes.map((mb) => (
                <tr key={mb.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3 font-semibold text-slate-800">{mb.email}</td>
                  <td className="px-6 py-3 text-xs text-slate-600">
                    {mb.usedMb} MB / {(mb.limitMb / 1024).toFixed(0)} GB ({mb.percent}%)
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-36 bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          mb.percent > 85 ? "bg-rose-500" : mb.percent > 65 ? "bg-amber-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${mb.percent}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        mb.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {mb.status}
                    </span>
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
