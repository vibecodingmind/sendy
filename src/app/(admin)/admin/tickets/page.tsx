"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  Search,
  MessageSquare,
  ShieldCheck,
  Send,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Filter,
} from "lucide-react";

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  createdAt: string;
  updatedAt: string;
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    messages: number;
  };
}

interface Message {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/v1/support/tickets"
          : `/api/v1/support/tickets?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load admin tickets", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTicketDetails(id: string) {
    setLoadingTicket(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      }
    } catch (err) {
      console.error("Failed to load ticket details", err);
    } finally {
      setLoadingTicket(false);
    }
  }

  async function handleStatusChange(ticketId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/v1/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
        fetchTickets();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setReplying(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });

      if (res.ok) {
        setReplyText("");
        await loadTicketDetails(selectedTicket.id);
        fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to post reply");
      }
    } catch {
      alert("Error sending reply");
    } finally {
      setReplying(false);
    }
  }

  const filtered = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.organization?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityClass = (p: string) => {
    switch (p) {
      case "URGENT":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "MEDIUM":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  const getStatusClass = (s: string) => {
    switch (s) {
      case "OPEN":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "IN_PROGRESS":
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
      case "RESOLVED":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-6 h-6 text-amber-400" />
            Support Ticket Triage
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Resolve deliverability issues, DNS setup queries, and customer technical requests across all hosted organizations.
          </p>
        </div>
      </div>

      {selectedTicket ? (
        /* Thread Viewer */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-amber-400">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {selectedTicket.organization?.name}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityClass(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-1">
                  {selectedTicket.subject}
                </h2>
              </div>
            </div>

            {/* Quick Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={selectedTicket.status}
                onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto bg-slate-950/40">
            {selectedTicket.messages?.map((msg: Message) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.isStaff ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-2xl rounded-xl p-4 border ${
                    msg.isStaff
                      ? "bg-amber-950/30 border-amber-500/30 text-slate-100"
                      : "bg-slate-800 border-slate-700 text-slate-200"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between gap-4 pb-2 mb-2 border-b text-xs ${
                      msg.isStaff
                        ? "border-amber-500/20 text-amber-400"
                        : "border-slate-700 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {msg.isStaff ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span>Staff Support Response</span>
                        </>
                      ) : (
                        <span>Customer ({msg.user.email})</span>
                      )}
                    </div>
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Admin Reply Form */}
          <form onSubmit={handleSendReply} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to customer as Super Admin / Mail Engineer..."
              rows={2}
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={replying || !replyText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm transition disabled:opacity-50 self-end"
            >
              <Send className="w-4 h-4" />
              {replying ? "Sending..." : "Send Reply"}
            </button>
          </form>
        </div>
      ) : (
        /* Ticket List */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket #, subject, or org..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading tickets...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <LifeBuoy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-200">No support tickets found</h3>
                <p className="text-sm text-slate-500 mt-1">No customer tickets matching the selected filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => loadTicketDetails(t.id)}
                    className="p-4 sm:p-5 hover:bg-slate-800/60 cursor-pointer transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-amber-400 font-semibold">
                          {t.ticketNumber}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {t.organization?.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusClass(
                            t.status
                          )}`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityClass(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{t.subject}</h4>
                      <p className="text-xs text-slate-500">
                        Customer: {t.user?.email} • Updated {new Date(t.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="flex items-center gap-1 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t._count?.messages || 1}</span>
                      </div>
                      <span className="text-slate-600">→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
