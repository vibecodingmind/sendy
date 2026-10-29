"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Radio,
  Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface DomainItem {
  id: string;
  name: string;
  status: string;
  isVerified: boolean;
  dkimSelector: string;
  dkimPublicKey?: string;
  catchAllMailboxId?: string | null;
  mailboxes?: Array<{ id: string; email: string }>;
  createdAt: string;
  _count: {
    mailboxes: number;
    aliases: number;
    forwarders: number;
  };
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [updatingCatchAllId, setUpdatingCatchAllId] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/v1/domains");
      if (res.ok) {
        const data = await res.json();
        setDomains(data.domains || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add domain.");
      } else {
        setSuccess(`Domain ${newDomain} added! Please configure DNS records.`);
        setNewDomain("");
        fetchDomains();
      }
    } catch {
      setError("Network error adding domain.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDns = async (id: string) => {
    setVerifyingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/domains/${id}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.isVerified) {
        setSuccess("Domain verified and ready to send & receive emails!");
      } else {
        setError("DNS verification incomplete. Please review detected records in DNS Setup.");
      }
      fetchDomains();
    } catch {
      setError("DNS check failed.");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? All mailboxes under this domain will be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/domains/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDomains(domains.filter((d) => d.id !== id));
      }
    } catch {
      setError("Failed to delete domain.");
    }
  };

  const handleUpdateCatchAll = async (domainId: string, mailboxId: string) => {
    setUpdatingCatchAllId(domainId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/v1/domains/${domainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catchAllMailboxId: mailboxId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || "Catch-All routing updated.");
        setDomains((prev) =>
          prev.map((d) => (d.id === domainId ? { ...d, catchAllMailboxId: mailboxId || null } : d))
        );
      } else {
        setError(data.error || "Failed to update Catch-All routing.");
      }
    } catch {
      setError("Network error updating Catch-All routing.");
    } finally {
      setUpdatingCatchAllId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains"
        description="Connect custom domains, publish SPF/DKIM/DMARC, and verify routing before mail goes live."
      />

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Domain Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Connect New Custom Domain</h2>
        <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="e.g. acmecorp.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            required
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{submitting ? "Adding..." : "Add Domain"}</span>
          </button>
        </form>
      </div>

      {/* Domains List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Your Connected Domains</h3>
          <span className="text-xs text-slate-400 font-medium">{domains.length} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading domains...</div>
        ) : domains.length === 0 ? (
          <div className="p-10 text-center">
            <Globe className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No domains added yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Add your domain above to start creating branded mailboxes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {domains.map((dom) => (
              <div key={dom.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-base font-bold text-slate-900">{dom.name}</span>
                    {dom.isVerified ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Pending DNS</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center space-x-3">
                    <span>{dom._count.mailboxes} Mailboxes</span>
                    <span>•</span>
                    <span>{dom._count.aliases} Aliases</span>
                    <span>•</span>
                    <span>{dom._count.forwarders} Forwarders</span>
                  </div>

                  {/* Catch-All Selector */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="inline-flex items-center space-x-1 text-slate-500 font-medium">
                      <Inbox className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Catch-All Routing (*@{dom.name}):</span>
                    </span>
                    {dom.mailboxes && dom.mailboxes.length > 0 ? (
                      <select
                        value={dom.catchAllMailboxId || ""}
                        disabled={updatingCatchAllId === dom.id}
                        onChange={(e) => handleUpdateCatchAll(dom.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="">Disabled (Reject / bounce unhandled mail)</option>
                        {dom.mailboxes.map((mb) => (
                          <option key={mb.id} value={mb.id}>
                            Route all unaddressed to {mb.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        Create a mailbox to enable catch-all routing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Link
                    href={`/dns-setup?domain=${dom.name}`}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-600" />
                    <span>DNS Records</span>
                  </Link>

                  <button
                    onClick={() => handleVerifyDns(dom.id)}
                    disabled={verifyingId === dom.id}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === dom.id ? "animate-spin" : ""}`} />
                    <span>{verifyingId === dom.id ? "Checking..." : "Verify DNS"}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(dom.id, dom.name)}
                    title="Delete domain"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
