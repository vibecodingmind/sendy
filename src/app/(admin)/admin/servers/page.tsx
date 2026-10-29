"use client";

import React, { useEffect, useState } from "react";
import { Server, Plus, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

interface ServerItem {
  id: string;
  name: string;
  hostname: string;
  ipAddress: string;
  location: string;
  providerType: string;
  status: string;
  capacityMailboxes: number;
  capacityStorageGb: number;
  allocatedMailboxes: number;
  allocatedStorageGb: number;
  _count: { organizations: number; domains: number };
  health?: {
    online: boolean;
    latencyMs: number;
    smtpReachable: boolean;
    imapReachable: boolean;
    dbReachable: boolean;
    message?: string;
  };
}

export default function AdminServersPage() {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    hostname: "",
    ipAddress: "",
    location: "US-East (N. Virginia)",
    providerType: "mock",
    capacityMailboxes: 1000,
    capacityStorageGb: 5000,
  });
  const [adding, setAdding] = useState(false);

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/v1/admin/servers");
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/v1/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({
          name: "",
          hostname: "",
          ipAddress: "",
          location: "US-East (N. Virginia)",
          providerType: "mock",
          capacityMailboxes: 1000,
          capacityStorageGb: 5000,
        });
        fetchServers();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to add server");
      }
    } catch {
      alert("Error adding mail server");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mail Infrastructure Servers</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage physical and VPS mail cluster nodes running Postfix, Dovecot, and Rspamd.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Node</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {servers.map((srv) => (
          <div
            key={srv.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Server className="w-5 h-5 text-amber-400" />
                <span className="text-base font-bold text-white">{srv.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  {srv.providerType.toUpperCase()}
                </span>
              </div>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  srv.health?.online
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "bg-rose-950 text-rose-300 border border-rose-800"
                }`}
              >
                {srv.health?.online ? "ONLINE" : "OFFLINE"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 font-medium">Hostname</span>
                <div className="font-mono text-slate-200 mt-0.5">{srv.hostname}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">IP Address</span>
                <div className="font-mono text-slate-200 mt-0.5">{srv.ipAddress}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Location</span>
                <div className="text-slate-200 mt-0.5">{srv.location}</div>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Allocated Tenants</span>
                <div className="text-slate-200 mt-0.5">{srv._count.organizations} Orgs ({srv._count.domains} Domains)</div>
              </div>
            </div>

            {/* Health indicators */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">SMTP (465)</span>
                <span className={srv.health?.smtpReachable ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {srv.health?.smtpReachable ? "OK" : "DOWN"}
                </span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">IMAP (993)</span>
                <span className={srv.health?.imapReachable ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  {srv.health?.imapReachable ? "OK" : "DOWN"}
                </span>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block">Latency</span>
                <span className="text-amber-400 font-bold">{srv.health?.latencyMs || 0} ms</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-slate-200">
            <h3 className="text-base font-bold text-white mb-4">Add Mail Server Node</h3>
            <form onSubmit={handleAddServer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Server Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. MAIL-02"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Hostname (FQDN)</label>
                <input
                  type="text"
                  placeholder="mail02.monogrammail.com"
                  required
                  value={form.hostname}
                  onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">IP Address</label>
                <input
                  type="text"
                  placeholder="198.51.100.30"
                  required
                  value={form.ipAddress}
                  onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Provider Adapter</label>
                <select
                  value={form.providerType}
                  onChange={(e) => setForm({ ...form, providerType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value="mock">Mock Provider (Local/Test)</option>
                  <option value="iredmail">iRedMail (Postfix/Dovecot vmail SQL)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold disabled:opacity-50"
                >
                  {adding ? "Adding..." : "Add Server"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
