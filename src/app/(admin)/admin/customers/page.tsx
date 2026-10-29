"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Building2,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Edit3,
  Key,
  Mail,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  subscription: { status: string; plan: { name: string; priceMonthlyCents: number } } | null;
  mailServer: { id: string; name: string } | null;
  _count: { domains: number; mailboxes: number };
  members: Array<{ user: { id: string; email: string; firstName?: string; lastName?: string } }>;
}

interface UserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  emailVerified: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  memberships: Array<{
    id: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
  }>;
}

export default function AdminCustomersPage() {
  const [activeTab, setActiveTab] = useState<"organizations" | "users">("organizations");

  // Organizations state
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState("ALL");

  // Edit User Modal state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("CUSTOMER_ADMIN");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editEmailVerified, setEditEmailVerified] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Verification Link Generation state
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  // Fetch Organizations
  const fetchCustomers = async () => {
    setOrgLoading(true);
    try {
      const res = await fetch("/api/v1/admin/customers");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations || []);
      }
    } catch {
      // ignore
    } finally {
      setOrgLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (verifiedFilter !== "ALL") params.set("verified", verifiedFilter);

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  const handleToggleOrgStatus = async (org: OrganizationItem) => {
    const newStatus = org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    if (!confirm(`Are you sure you want to mark ${org.name} as ${newStatus}?`)) return;

    setUpdatingOrgId(org.id);
    try {
      const res = await fetch("/api/v1/admin/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id, status: newStatus }),
      });
      if (res.ok) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, status: newStatus } : o))
        );
      }
    } catch {
      alert("Failed to update customer status");
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const handleOpenEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditEmailVerified(Boolean(user.emailVerified));
    setEditNewPassword("");
    setShowPassword(false);
    setModalError(null);
    setModalSuccess(null);
    setVerificationUrl(null);
    setLinkCopied(false);
  };

  const handleCloseEditModal = () => {
    setSelectedUser(null);
    setModalError(null);
    setModalSuccess(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setModalSaving(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const payload: any = {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        role: editRole,
        isActive: editIsActive,
        emailVerified: editEmailVerified,
      };

      if (editNewPassword.trim()) {
        payload.newPassword = editNewPassword.trim();
      }

      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user account");
      }

      setModalSuccess("Account details saved successfully!");
      setEditNewPassword("");

      // Update in-memory user list
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, ...data.user } : u))
      );

      setTimeout(() => {
        setModalSuccess(null);
      }, 3000);
    } catch (err: any) {
      setModalError(err.message || "Failed to save user");
    } finally {
      setModalSaving(false);
    }
  };

  const handleGenerateVerificationLink = async () => {
    if (!selectedUser) return;
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${selectedUser.id}/verification-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.verificationUrl) {
        setVerificationUrl(data.verificationUrl);
      } else {
        alert(data.error || "Failed to generate verification link");
      }
    } catch {
      alert("Error generating verification link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!verificationUrl) return;
    navigator.clipboard.writeText(verificationUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customers & User Accounts</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage tenant customer organizations, user logins, verified email badges, credentials, and access roles.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("organizations")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "organizations"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Customer Organizations</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-[10px] rounded-full">
              {organizations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "users"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-[10px] rounded-full">
              {users.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: Customer Organizations */}
      {activeTab === "organizations" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">All Registered Customer Organizations</h3>
            <button
              onClick={fetchCustomers}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {orgLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading organizations...</div>
          ) : organizations.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No organizations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Customer / Organization</th>
                    <th className="px-6 py-3">Admin Contact</th>
                    <th className="px-6 py-3">Plan</th>
                    <th className="px-6 py-3">Usage</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{org.name}</div>
                        <div className="text-xs text-slate-500 font-mono">ID: {org.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-slate-300">
                          {org.members[0]?.user.email || "No admin assigned"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-amber-400">
                          {org.subscription?.plan.name || "None"}
                        </div>
                        <div className="text-[11px] text-slate-500">{org.subscription?.status || "INACTIVE"}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        <div>{org._count.domains} Domains</div>
                        <div>{org._count.mailboxes} Mailboxes</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            org.status === "ACTIVE"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleOrgStatus(org)}
                          disabled={updatingOrgId === org.id}
                          className={`inline-flex items-center space-x-1 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                            org.status === "ACTIVE"
                              ? "bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-800"
                              : "bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-800"
                          }`}
                        >
                          {org.status === "ACTIVE" ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{org.status === "ACTIVE" ? "Suspend" : "Activate"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: User Accounts */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user accounts by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setTimeout(fetchUsers, 0);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="CUSTOMER_ADMIN">Customer Admin</option>
                <option value="MAILBOX_USER">Mailbox User</option>
              </select>

              <select
                value={verifiedFilter}
                onChange={(e) => {
                  setVerifiedFilter(e.target.value);
                  setTimeout(fetchUsers, 0);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
              >
                <option value="ALL">All Verification</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setTimeout(fetchUsers, 0);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-hidden focus:border-amber-500"
              >
                <option value="ALL">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                onClick={fetchUsers}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            {usersLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading user accounts...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No user accounts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3">User & Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Organization</th>
                      <th className="px-6 py-3">Verification</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {users.map((u) => {
                      const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || "Unnamed User";
                      const orgName = u.memberships[0]?.organization?.name || "None (Platform)";

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                                {fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{fullName}</div>
                                <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                u.role === "SUPER_ADMIN"
                                  ? "bg-amber-950 text-amber-300 border-amber-800"
                                  : u.role === "CUSTOMER_ADMIN"
                                  ? "bg-indigo-950 text-indigo-300 border-indigo-800"
                                  : "bg-slate-800 text-slate-300 border-slate-700"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-300 font-medium">{orgName}</div>
                            {u.memberships[0]?.organization?.slug && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                /{u.memberships[0].organization.slug}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {u.emailVerified ? (
                              <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 font-semibold bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-xs text-amber-400 font-semibold bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Unverified</span>
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                u.isActive
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : "bg-rose-950 text-rose-300 border border-rose-800"
                              }`}
                            >
                              {u.isActive ? "Active" : "Suspended"}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              className="inline-flex items-center space-x-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Account</span>
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
        </div>
      )}

      {/* EDIT USER MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Edit User Account</h3>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 text-xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-200 rounded-lg text-xs flex items-center space-x-2">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-lg text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                    placeholder="e.g. John"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                    placeholder="e.g. Doe"
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Email Address (Login Username)</label>
                  <span className="text-[10px] text-amber-400">Modifying changes user login credential</span>
                </div>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Platform Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="CUSTOMER_ADMIN">CUSTOMER_ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="MAILBOX_USER">MAILBOX_USER</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Account Access Status</label>
                  <select
                    value={editIsActive ? "active" : "suspended"}
                    onChange={(e) => setEditIsActive(e.target.value === "active")}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="suspended">Suspended (Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Email Verification Toggle & Generator Section */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200">Email Verification Status</div>
                    <div className="text-[11px] text-slate-400">
                      Toggle verification directly or generate an activation link.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditEmailVerified(!editEmailVerified)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center space-x-1 ${
                      editEmailVerified
                        ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                        : "bg-amber-950 text-amber-300 border-amber-800"
                    }`}
                  >
                    {editEmailVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span>{editEmailVerified ? "Verified" : "Unverified"}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Verification Link Generator</span>
                    <button
                      type="button"
                      onClick={handleGenerateVerificationLink}
                      disabled={generatingLink}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-semibold"
                    >
                      <RefreshCw className={`w-3 h-3 ${generatingLink ? "animate-spin" : ""}`} />
                      <span>{generatingLink ? "Generating..." : "Generate Verification Link"}</span>
                    </button>
                  </div>

                  {verificationUrl && (
                    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-2">
                      <input
                        type="text"
                        readOnly
                        value={verificationUrl}
                        className="bg-transparent border-none text-[11px] text-slate-300 font-mono flex-1 focus:outline-hidden select-all"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                      >
                        {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{linkCopied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Reset Section */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>Set New Password (Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Leave blank to keep existing password"
                    minLength={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">Minimum 6 characters. Will hash and update immediately.</p>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1"
                >
                  {modalSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
