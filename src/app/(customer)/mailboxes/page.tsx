"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Plus,
  KeyRound,
  Trash2,
  Lock,
  Unlock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  X,
  CalendarClock,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface MailboxItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  storageLimitMb: number;
  usedStorageBytes: number;
  status: string;
  autoResponderEnabled?: boolean;
  autoResponderSubject?: string;
  autoResponderBody?: string;
  autoResponderStartDate?: string | null;
  autoResponderEndDate?: string | null;
  createdAt: string;
  domain: { id: string; name: string; status: string };
  aliases: Array<{ id: string; sourceAddress: string }>;
}

interface DomainOption {
  id: string;
  name: string;
  isVerified: boolean;
}

export default function MailboxesPage() {
  const [mailboxes, setMailboxes] = useState<MailboxItem[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    domainId: "",
    username: "",
    firstName: "",
    lastName: "",
    password: "",
    storageLimitMb: 10240, // 10 GB
  });
  const [creating, setCreating] = useState(false);

  // Reset Password Modal
  const [resetModalMailbox, setResetModalMailbox] = useState<MailboxItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Auto-Responder / Out of Office Modal
  const [arModalMailbox, setArModalMailbox] = useState<MailboxItem | null>(null);
  const [arLoading, setArLoading] = useState(false);
  const [arSaving, setArSaving] = useState(false);
  const [arForm, setArForm] = useState({
    enabled: false,
    subject: "",
    body: "",
    startDate: "",
    endDate: "",
  });

  const fetchData = async () => {
    try {
      const [mbRes, domRes] = await Promise.all([
        fetch("/api/v1/mailboxes"),
        fetch("/api/v1/domains"),
      ]);

      if (mbRes.ok && domRes.ok) {
        const mbData = await mbRes.json();
        const domData = await domRes.json();
        setMailboxes(mbData.mailboxes || []);
        const domList = domData.domains || [];
        setDomains(domList);
        if (domList.length > 0 && !createForm.domainId) {
          setCreateForm((prev) => ({ ...prev, domainId: domList[0].id }));
        }
      }
    } catch {
      setError("Failed to load mailboxes.");
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
    setCreating(true);

    try {
      const res = await fetch("/api/v1/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create mailbox.");
      } else {
        setSuccess(`Mailbox ${createForm.username}@... created successfully!`);
        setShowCreateModal(false);
        setCreateForm({
          domainId: domains[0]?.id || "",
          username: "",
          firstName: "",
          lastName: "",
          password: "",
          storageLimitMb: 10240,
        });
        fetchData();
      }
    } catch {
      setError("Error creating mailbox.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (mb: MailboxItem) => {
    const newStatus = mb.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/v1/mailboxes/${mb.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMailboxes(
          mailboxes.map((m) => (m.id === mb.id ? { ...m, status: newStatus } : m))
        );
      }
    } catch {
      setError("Failed to update mailbox status.");
    }
  };

  const handleOpenAutoResponder = async (mb: MailboxItem) => {
    setArModalMailbox(mb);
    setArLoading(true);
    try {
      const res = await fetch(`/api/v1/mailboxes/${mb.id}/auto-responder`);
      if (res.ok) {
        const data = await res.json();
        setArForm({
          enabled: Boolean(data.autoResponder?.enabled),
          subject: data.autoResponder?.subject || "Out of Office Notice",
          body: data.autoResponder?.body || "",
          startDate: data.autoResponder?.startDate || "",
          endDate: data.autoResponder?.endDate || "",
        });
      } else {
        setArForm({
          enabled: false,
          subject: "Out of Office Notice",
          body: "",
          startDate: "",
          endDate: "",
        });
      }
    } catch {
      setArForm({
        enabled: false,
        subject: "Out of Office Notice",
        body: "",
        startDate: "",
        endDate: "",
      });
    } finally {
      setArLoading(false);
    }
  };

  const handleSaveAutoResponder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arModalMailbox) return;
    setArSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/mailboxes/${arModalMailbox.id}/auto-responder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Out of Office settings updated for ${arModalMailbox.email}`);
        setMailboxes((prev) =>
          prev.map((m) =>
            m.id === arModalMailbox.id
              ? {
                  ...m,
                  autoResponderEnabled: arForm.enabled,
                  autoResponderSubject: arForm.subject,
                  autoResponderBody: arForm.body,
                  autoResponderStartDate: arForm.startDate || null,
                  autoResponderEndDate: arForm.endDate || null,
                }
              : m
          )
        );
        setArModalMailbox(null);
      } else {
        setError(data.error || "Failed to update out of office settings.");
      }
    } catch {
      setError("Network error saving out of office settings.");
    } finally {
      setArSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalMailbox) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/v1/mailboxes/${resetModalMailbox.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        setSuccess(`Password for ${resetModalMailbox.email} has been updated.`);
        setResetModalMailbox(null);
        setNewPassword("");
      } else {
        const d = await res.json();
        setError(d.error || "Failed to reset password.");
      }
    } catch {
      setError("Password reset request failed.");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to permanently delete mailbox ${email}? All emails and aliases will be removed.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/mailboxes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMailboxes(mailboxes.filter((m) => m.id !== id));
      }
    } catch {
      setError("Failed to delete mailbox.");
    }
  };

  const criticalMailboxes = mailboxes.filter((mb) => {
    const usedMb = mb.usedStorageBytes / (1024 * 1024);
    return Math.round((usedMb / mb.storageLimitMb) * 100) >= 80;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mailboxes"
        description="Provision accounts, reset passwords, set quotas, and manage mailbox status."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={domains.length === 0}
            className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Create mailbox</span>
          </button>
        }
      />

      {/* Storage Quota Warning Banner */}
      {criticalMailboxes.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Storage Quota Alert:</span>{" "}
              {criticalMailboxes.length === 1
                ? `${criticalMailboxes[0].email} is utilizing over 80% of its storage quota.`
                : `${criticalMailboxes.length} mailboxes are approaching their storage quota limits.`}
              <span className="block text-xs text-amber-700 mt-0.5">
                Accounts exceeding 100% capacity will automatically bounce incoming emails. Upgrade your organization plan to expand capacity.
              </span>
            </div>
          </div>
          <Link
            href="/billing"
            className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs"
          >
            <span>Upgrade Storage Plan</span>
            <span>&rarr;</span>
          </Link>
        </div>
      )}

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

      {/* Mailboxes List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Provisioned Mailboxes</h3>
          <span className="text-xs text-slate-500 font-medium">{mailboxes.length} active</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading mailboxes...</div>
        ) : mailboxes.length === 0 ? (
          <div className="p-10 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No mailboxes created yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Create your first business email address above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Mailbox</th>
                  <th className="px-6 py-3">User Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Storage Quota</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mailboxes.map((mb) => {
                  const usedMb = parseFloat((mb.usedStorageBytes / (1024 * 1024)).toFixed(1));
                  const limitMb = mb.storageLimitMb;
                  const percent = Math.min(100, Math.round((usedMb / limitMb) * 100));

                  return (
                    <tr key={mb.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{mb.email}</div>
                        {mb.aliases.length > 0 && (
                          <div className="text-[11px] text-slate-400">
                            Aliases: {mb.aliases.map((a) => a.sourceAddress).join(", ")}
                          </div>
                        )}
                        {mb.autoResponderEnabled && (
                          <div className="mt-1">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <CalendarClock className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>Out of Office Active</span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {mb.firstName || mb.lastName ? `${mb.firstName || ""} ${mb.lastName || ""}` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            mb.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {mb.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-600">
                          {usedMb} MB / {(limitMb / 1024).toFixed(0)} GB ({percent}%)
                        </div>
                        <div className="w-32 bg-slate-100 rounded-full h-1.5 mt-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              percent >= 95 ? "bg-rose-500" : percent >= 80 ? "bg-amber-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        {percent >= 95 ? (
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Near Full
                            </span>
                            <Link href="/billing" className="text-indigo-600 hover:underline font-semibold text-[10px]">
                              Upgrade &rarr;
                            </Link>
                          </div>
                        ) : percent >= 80 ? (
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> &gt;80% Used
                            </span>
                            <Link href="/billing" className="text-indigo-600 hover:underline font-semibold text-[10px]">
                              Expand &rarr;
                            </Link>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenAutoResponder(mb)}
                          title="Out of Office / Auto-Responder"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setResetModalMailbox(mb)}
                          title="Reset Password"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(mb)}
                          title={mb.status === "ACTIVE" ? "Suspend Mailbox" : "Activate Mailbox"}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        >
                          {mb.status === "ACTIVE" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(mb.id, mb.email)}
                          title="Delete Mailbox"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Mailbox Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create New Mailbox</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="text"
                    placeholder="john"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-500 font-bold">@</span>
                  <select
                    value={createForm.domainId}
                    onChange={(e) => setCreateForm({ ...createForm, domainId: e.target.value })}
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mailbox Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Storage Quota</label>
                <select
                  value={createForm.storageLimitMb}
                  onChange={(e) => setCreateForm({ ...createForm, storageLimitMb: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value={5120}>5 GB</option>
                  <option value={10240}>10 GB</option>
                  <option value={25600}>25 GB</option>
                  <option value={51200}>50 GB</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {creating ? "Provisioning..." : "Create Mailbox"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalMailbox && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => setResetModalMailbox(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <p className="text-xs text-slate-500">
                Set a new password for <span className="font-semibold text-slate-800">{resetModalMailbox.email}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setResetModalMailbox(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {resetting ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Responder / Vacation Notice Modal */}
      {arModalMailbox && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Out of Office Auto-Responder</h3>
                  <p className="text-xs text-slate-500 font-mono">{arModalMailbox.email}</p>
                </div>
              </div>
              <button
                onClick={() => setArModalMailbox(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {arLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading settings...</div>
            ) : (
              <form onSubmit={handleSaveAutoResponder} className="space-y-4 mt-4">
                {/* Enable Switch */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Automatic Reply</span>
                    <span className="text-[11px] text-slate-500">Send an automated vacation response to incoming emails</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={arForm.enabled}
                      onChange={(e) => setArForm({ ...arForm, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Line</label>
                  <input
                    type="text"
                    required={arForm.enabled}
                    placeholder="e.g. Out of Office: Thank you for contacting me"
                    value={arForm.subject}
                    onChange={(e) => setArForm({ ...arForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Response Message</label>
                  <textarea
                    rows={4}
                    required={arForm.enabled}
                    placeholder="I am currently out of the office with limited access to email. I will respond to your inquiry upon my return."
                    value={arForm.body}
                    onChange={(e) => setArForm({ ...arForm, body: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date (Optional)</label>
                    <input
                      type="date"
                      value={arForm.startDate}
                      onChange={(e) => setArForm({ ...arForm, startDate: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Optional)</label>
                    <input
                      type="date"
                      value={arForm.endDate}
                      onChange={(e) => setArForm({ ...arForm, endDate: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setArModalMailbox(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={arSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {arSaving ? "Saving..." : "Save Auto-Responder"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
