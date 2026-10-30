"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Globe,
  HardDrive,
  DollarSign,
  Server,
  ArrowRight,
} from "lucide-react";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/ui/AdminStatCard";

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
    return (
      <div className="admin-card p-12 text-center text-sm text-slate-400 animate-pulse">
        Loading platform overview…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Platform overview"
        description="Revenue, customer organizations, hosted domains, and mail cluster capacity."
        actions={
          <Link href="/admin/health" className="btn-admin-secondary">
            View system health
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminStatCard
          label="Monthly revenue"
          value={`$${data?.monthlyRevenueUsd ?? 0}`}
          hint={`${data?.activeSubscriptionsCount ?? 0} active subscriptions`}
          icon={DollarSign}
          accent="emerald"
        />
        <AdminStatCard
          label="Organizations"
          value={data?.totalCustomers ?? 0}
          hint={`${data?.activeCustomers ?? 0} active`}
          icon={Users}
          accent="sky"
          footer={
            <Link
              href="/admin/customers"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
            >
              Manage customers
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <AdminStatCard
          label="Hosted domains"
          value={data?.totalDomains ?? 0}
          hint={`${data?.verifiedDomains ?? 0} DNS verified`}
          icon={Globe}
          accent="violet"
        />
        <AdminStatCard
          label="Mailboxes"
          value={data?.totalMailboxes ?? 0}
          hint={`${data?.totalStorageGb ?? 0} GB stored`}
          icon={HardDrive}
          accent="amber"
        />
      </div>

      <div className="admin-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Mail infrastructure fleet</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {data?.totalServers ?? 0} active node(s) · Postfix, Dovecot, Rspamd
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/servers" className="btn-admin-primary">
            Manage nodes
          </Link>
          <Link href="/admin/settings" className="btn-admin-secondary">
            Platform settings
          </Link>
        </div>
      </div>
    </div>
  );
}
