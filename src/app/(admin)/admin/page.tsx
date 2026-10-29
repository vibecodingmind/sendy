"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Globe,
  Mail,
  HardDrive,
  DollarSign,
  Server,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface AdminOverview {
  totalCustomers: number;
  activeCustomers: number;
  totalDomains: number;
  verifiedDomains: number;
  totalMailboxes: number;
  totalStorageGb: number;
  monthlyRevenueUsd: number;
  activeSubscriptionsCount: number;
  totalServers: number;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.overview) setData(d.overview);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading platform overview...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center space-x-2 text-amber-400 mb-1">
          <Activity className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Super Admin Control Plane</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Overview</h1>
        <p className="text-xs text-slate-400 mt-1">
          Global operations, cluster capacity, customer subscriptions, and infrastructure health metrics.
        </p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white">${data?.monthlyRevenueUsd}</span>
            <span className="text-xs text-slate-400 ml-1">/ mo</span>
            <p className="text-xs text-emerald-400 mt-1">
              {data?.activeSubscriptionsCount} active subscriptions
            </p>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Customer Orgs</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white">{data?.totalCustomers}</span>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-emerald-400 font-semibold">{data?.activeCustomers}</span> active organizations
            </p>
          </div>
          <Link
            href="/admin/customers"
            className="text-xs text-amber-400 hover:text-amber-300 mt-3 flex items-center space-x-1"
          >
            <span>Manage customers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Total Domains */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Hosted Domains</span>
            <Globe className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white">{data?.totalDomains}</span>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-emerald-400 font-semibold">{data?.verifiedDomains}</span> DNS verified
            </p>
          </div>
        </div>

        {/* Total Mailboxes & Storage */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Mailboxes & Storage</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-white">{data?.totalMailboxes}</div>
            <p className="text-xs text-slate-400 mt-1">
              {data?.totalStorageGb} GB mail volume stored
            </p>
          </div>
        </div>
      </div>

      {/* Infrastructure Nodes Callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Mail Infrastructure Fleet</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {data?.totalServers} mail server node(s) operating in cluster. Postfix, Dovecot, and Rspamd active.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/health"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            System Health
          </Link>
          <Link
            href="/admin/servers"
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            Manage Nodes
          </Link>
        </div>
      </div>
    </div>
  );
}
