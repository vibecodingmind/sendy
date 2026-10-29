"use client";

import React, { useEffect, useState } from "react";
import { CornerUpRight, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface ForwarderItem {
  id: string;
  sourceAddress: string;
  destinationAddress: string;
  keepLocalCopy: boolean;
  status: string;
  domain: { id: string; name: string };
}

interface DomainOption {
  id: string;
  name: string;
}

export default function ForwardersPage() {
  const [forwarders, setForwarders] = useState<ForwarderItem[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    domainId: "",
    sourcePrefix: "",
    destinationAddress: "",
    keepLocalCopy: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [fwdRes, domRes] = await Promise.all([
        fetch("/api/v1/forwarders"),
        fetch("/api/v1/domains"),
      ]);

      if (fwdRes.ok && domRes.ok) {
        const fData = await fwdRes.json();
        const dData = await domRes.json();
        setForwarders(fData.forwarders || []);
        const domList = dData.domains || [];
        setDomains(domList);
        if (domList.length > 0 && !form.domainId) {
          setForm((prev) => ({ ...prev, domainId: domList[0].id }));
        }
      }
    } catch {
      setError("Failed to load forwarders.");
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
      const res = await fetch("/api/v1/forwarders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create forwarder.");
      } else {
        setSuccess("Forwarding rule created successfully!");
        setForm({ ...form, sourcePrefix: "", destinationAddress: "" });
        fetchData();
      }
    } catch {
      setError("Error creating forwarder.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, sourceAddress: string) => {
    if (!confirm(`Remove forwarder for ${sourceAddress}?`)) return;
    try {
      const res = await fetch(`/api/v1/forwarders?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setForwarders(forwarders.filter((f) => f.id !== id));
      }
    } catch {
      setError("Failed to delete forwarder.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forwarders"
        description="Forward mail to external inboxes or tools, with optional copy kept on the server."
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

      {/* Add Forwarder Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Add Forwarding Rule</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Source Email Address</label>
            <div className="flex items-center space-x-1">
              <input
                type="text"
                placeholder="contact"
                required
                value={form.sourcePrefix}
                onChange={(e) => setForm({ ...form, sourcePrefix: e.target.value })}
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Address (External)</label>
            <input
              type="email"
              placeholder="e.g. founder@personal.com"
              required
              value={form.destinationAddress}
              onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="keepCopy"
                checked={form.keepLocalCopy}
                onChange={(e) => setForm({ ...form, keepLocalCopy: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="keepCopy" className="text-xs text-slate-600">
                Keep copy in local mailbox
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting || domains.length === 0}
              className="w-full inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? "Saving..." : "Add Forwarder"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Forwarders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Active Forwarders</h3>
          <span className="text-xs text-slate-500 font-medium">{forwarders.length} active</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading forwarders...</div>
        ) : forwarders.length === 0 ? (
          <div className="p-10 text-center">
            <CornerUpRight className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No forwarders configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Add a forwarding rule above to redirect incoming messages automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Source Address</th>
                  <th className="px-6 py-3"></th>
                  <th className="px-6 py-3">Forward To</th>
                  <th className="px-6 py-3">Local Copy</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forwarders.map((fwd) => (
                  <tr key={fwd.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{fwd.sourceAddress}</td>
                    <td className="px-6 py-4 text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </td>
                    <td className="px-6 py-4 text-indigo-600 font-mono text-xs">{fwd.destinationAddress}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          fwd.keepLocalCopy ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {fwd.keepLocalCopy ? "Kept in Inbox" : "Forward Only"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(fwd.id, fwd.sourceAddress)}
                        title="Delete forwarder"
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
