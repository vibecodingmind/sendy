"use client";

import React, { useEffect, useState } from "react";
import { Share2, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface AliasItem {
  id: string;
  sourceAddress: string;
  status: string;
  destinationMailbox: { id: string; email: string; firstName?: string; lastName?: string };
  domain: { id: string; name: string };
}

interface DomainOption {
  id: string;
  name: string;
}

interface MailboxOption {
  id: string;
  email: string;
}

export default function AliasesPage() {
  const [aliases, setAliases] = useState<AliasItem[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [mailboxes, setMailboxes] = useState<MailboxOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    domainId: "",
    aliasPrefix: "",
    destinationMailboxId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [aliasRes, domRes, mbRes] = await Promise.all([
        fetch("/api/v1/aliases"),
        fetch("/api/v1/domains"),
        fetch("/api/v1/mailboxes"),
      ]);

      if (aliasRes.ok && domRes.ok && mbRes.ok) {
        const aData = await aliasRes.json();
        const dData = await domRes.json();
        const mData = await mbRes.json();
        setAliases(aData.aliases || []);
        const domList = dData.domains || [];
        const mbList = mData.mailboxes || [];
        setDomains(domList);
        setMailboxes(mbList);

        if (domList.length > 0 && !form.domainId) {
          setForm((prev) => ({
            ...prev,
            domainId: domList[0].id,
            destinationMailboxId: mbList[0]?.id || "",
          }));
        }
      }
    } catch {
      setError("Failed to load aliases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create alias.");
      } else {
        setSuccess("Alias created successfully!");
        setForm({ ...form, aliasPrefix: "" });
        fetchData();
      }
    } catch {
      setError("Error creating alias.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, sourceAddress: string) => {
    if (!confirm(`Delete alias ${sourceAddress}? Incoming mail to this alias will no longer be routed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/aliases?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAliases(aliases.filter((a) => a.id !== id));
      }
    } catch {
      setError("Failed to delete alias.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Aliases</h1>
        <p className="text-sm text-slate-500 mt-1">
          Route multiple email addresses (e.g. sales@, info@, billing@) to an existing team mailbox without creating separate accounts.
        </p>
      </div>

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

      {/* Add Alias Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Create New Alias</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alias Address</label>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                placeholder="sales"
                required
                value={form.aliasPrefix}
                onChange={(e) => setForm({ ...form, aliasPrefix: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-slate-500 font-bold">@</span>
              <select
                value={form.domainId}
                onChange={(e) => setForm({ ...form, domainId: e.target.value })}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Deliver To Mailbox</label>
            <select
              value={form.destinationMailboxId}
              onChange={(e) => setForm({ ...form, destinationMailboxId: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {mailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting || mailboxes.length === 0}
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? "Creating..." : "Create Alias"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Aliases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Configured Aliases</h3>
          <span className="text-xs text-slate-500 font-medium">{aliases.length} active</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading aliases...</div>
        ) : aliases.length === 0 ? (
          <div className="p-10 text-center">
            <Share2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No aliases configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Create an alias like sales@ or info@ to route emails to your primary mailbox.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Incoming Alias Address</th>
                  <th className="px-6 py-3"></th>
                  <th className="px-6 py-3">Destination Mailbox</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aliases.map((al) => (
                  <tr key={al.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{al.sourceAddress}</td>
                    <td className="px-6 py-4 text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </td>
                    <td className="px-6 py-4 text-indigo-600 font-medium">
                      {al.destinationMailbox.email}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(al.id, al.sourceAddress)}
                        title="Delete alias"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
