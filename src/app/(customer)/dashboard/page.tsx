import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import {
  Globe,
  Mail,
  HardDrive,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { getAppSettings } from "@/lib/config";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ProductNotice } from "@/components/ui/ProductNotice";

export default async function CustomerDashboardPage() {
  const { organization, subscription } = await requireTenantContext();
  const settings = await getAppSettings();

  // Fetch counts and usage in parallel
  const [domains, mailboxes, pendingDnsCount] = await Promise.all([
    prisma.domain.findMany({
      where: { organizationId: organization.id },
      include: {
        _count: { select: { mailboxes: true } },
      },
    }),
    prisma.mailbox.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        email: true,
        status: true,
        storageLimitMb: true,
        usedStorageBytes: true,
      },
    }),
    prisma.domain.count({
      where: { organizationId: organization.id, isVerified: false },
    }),
  ]);

  const totalUsedBytes = mailboxes.reduce(
    (acc, mb) => acc + Number(mb.usedStorageBytes),
    0
  );
  const usedStorageGb = parseFloat((totalUsedBytes / (1024 * 1024 * 1024)).toFixed(1));
  const maxStorageGb = subscription?.plan?.maxStorageGb || 25;
  const storagePercent = Math.min(100, Math.round((usedStorageGb / maxStorageGb) * 100));

  const maxMailboxes = subscription?.plan?.maxMailboxes || 5;
  const totalMailboxes = mailboxes.length;
  const maxDomains = subscription?.plan?.maxDomains || 1;
  const totalDomains = domains.length;

  const renewalDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Lifetime / Trial";

  // Identify high-usage mailboxes (>85% full)
  const fullMailboxes = mailboxes.filter((mb) => {
    const limitBytes = mb.storageLimitMb * 1024 * 1024;
    return limitBytes > 0 && Number(mb.usedStorageBytes) / limitBytes > 0.85;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${organization.name}`}
        description="Overview of your business email infrastructure, DNS health, and plan usage."
        actions={
          <>
            <Link href="/domains" className="btn-secondary">
              <Plus className="w-4 h-4 text-slate-500" />
              Add domain
            </Link>
            <Link href="/mailboxes" className="btn-primary">
              <Plus className="w-4 h-4" />
              Create mailbox
            </Link>
          </>
        }
      />

      <ProductNotice
        id="webmail_simulator_v1"
        title="Built-in webmail is a preview environment"
        message="Use Open Webmail in the header for Roundcube, or connect via IMAP/SMTP. Production delivery requires iRedMail (MAIL_PROVIDER=iredmail) and verified DNS."
      />

      {/* Actionable Alerts Banner */}
      {pendingDnsCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900">
              DNS verification required ({pendingDnsCount} domain pending)
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Your email accounts cannot receive external emails until your MX, SPF, DKIM, and DMARC DNS records are verified.
            </p>
          </div>
          <Link
            href="/dns-setup"
            className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
          >
            Verify DNS
          </Link>
        </div>
      )}

      {fullMailboxes.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-900">
              Mailbox nearing storage quota
            </h3>
            <p className="text-xs text-rose-700 mt-0.5">
              {fullMailboxes.map((m) => m.email).join(", ")} is over 85% full. Incoming mail may bounce if storage fills up.
            </p>
          </div>
          <Link
            href="/mailboxes"
            className="text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-md transition-colors"
          >
            Adjust Quota
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Subscription"
          value={subscription?.plan?.name || "Trial"}
          hint={`${subscription?.status || "ACTIVE"} · until ${renewalDate}`}
          icon={CreditCard}
          tone="brand"
          footer={
            <Link
              href="/billing"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Manage billing <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <StatCard
          label="Domains"
          value={`${totalDomains} / ${maxDomains}`}
          hint={
            pendingDnsCount > 0
              ? `${pendingDnsCount} pending DNS verification`
              : "All domains verified"
          }
          icon={Globe}
          tone={pendingDnsCount > 0 ? "warning" : "success"}
          footer={
            <Link
              href="/domains"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              View domains <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <StatCard
          label="Mailboxes"
          value={`${totalMailboxes} / ${maxMailboxes}`}
          hint={`${maxMailboxes - totalMailboxes} slots remaining`}
          icon={Mail}
          tone="default"
          footer={
            <Link
              href="/mailboxes"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Manage mailboxes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
        <StatCard
          label="Storage"
          value={`${usedStorageGb} / ${maxStorageGb} GB`}
          hint={`${storagePercent}% of plan quota`}
          icon={HardDrive}
          tone={storagePercent > 85 ? "warning" : "default"}
          footer={
            <>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full ${
                    storagePercent > 85
                      ? "bg-rose-500"
                      : storagePercent > 65
                        ? "bg-amber-500"
                        : "bg-brand-600"
                  }`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <Link
                href="/usage"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-2"
              >
                Storage details <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          }
        />
      </div>

      {/* Fast Access Grid: Domains & Webmail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Domains list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Connected Domains</h2>
            <Link href="/domains" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          {domains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No domains added yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Connect your first custom domain to start sending and receiving emails under your brand.
              </p>
              <Link
                href="/domains"
                className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your Domain</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {domains.map((dom) => (
                <div key={dom.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{dom.name}</p>
                      <p className="text-xs text-slate-400">{dom._count.mailboxes} active mailboxes</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {dom.isVerified ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <Link
                        href="/dns-setup"
                        className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Pending DNS</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Webmail & Connection Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Webmail Entry</span>
            </div>
            <h3 className="text-lg font-bold">Access Your Inbox</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Login to Roundcube / Webmail to check, send, and filter your business emails securely via browser.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <Link
              href="/webmail"
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
            >
              <span>Open Webmail</span>
              <ExternalLink className="w-4 h-4" />
            </Link>

            <Link
              href="/settings"
              className="w-full block text-center py-2 text-xs text-slate-300 hover:text-white transition-colors"
            >
              View IMAP / SMTP Connection Setup →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
