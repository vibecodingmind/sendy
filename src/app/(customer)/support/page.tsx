"use client";

import React, { useState, useEffect } from "react";
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  ArrowLeft,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface SupportMessage {
  id: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

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
  messages?: SupportMessage[];
  _count?: {
    messages: number;
  };
}

export default function CustomerSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);

  // New ticket modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply state
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
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }

  async function openTicketDetail(ticketId: string) {
    setLoadingTicket(true);
    try {
      const res = await fetch(`/api/v1/support/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.ticket);
      }
    } catch (err) {
      console.error("Failed to fetch ticket detail", err);
    } finally {
      setLoadingTicket(false);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject,
          priority: newPriority,
          message: newMessage,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewSubject("");
        setNewMessage("");
        setNewPriority("MEDIUM");
        await fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create support ticket");
      }
    } catch {
      alert("An unexpected error occurred");
    } finally {
      setSubmitting(false);
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
        await openTicketDetail(selectedTicket.id);
        fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send reply");
      }
    } catch {
      alert("Error sending reply");
    } finally {
      setReplying(false);
    }
  }

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "IN_PROGRESS":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "RESOLVED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "CLOSED":
        return "bg-slate-100 text-slate-500 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="DNS, deliverability, and mailbox help from our engineering team."
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New ticket
          </button>
        }
      />

      {selectedTicket ? (
        /* Ticket Thread View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      selectedTicket.status
                    )}`}
                  >
                    {selectedTicket.status.replace("_", " ")}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedTicket.subject}
                </h2>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Opened on {new Date(selectedTicket.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Messages */}
          <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto bg-slate-50/20">
            {selectedTicket.messages?.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.isStaff ? "items-start" : "items-end"
                }`}
              >
                <div
                  className={`max-w-2xl rounded-xl p-4 shadow-xs border ${
                    msg.isStaff
                      ? "bg-white border-indigo-100 text-slate-900"
                      : "bg-indigo-600 text-white border-indigo-700"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between gap-4 pb-2 mb-2 border-b text-xs ${
                      msg.isStaff
                        ? "border-slate-100 text-slate-500"
                        : "border-indigo-500/50 text-indigo-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {msg.isStaff ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-indigo-600 font-semibold">Staff Support</span>
                        </>
                      ) : (
                        <span>You ({msg.user.firstName || msg.user.email})</span>
                      )}
                    </div>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          {selectedTicket.status !== "CLOSED" ? (
            <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response or additional information..."
                rows={2}
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <button
                type="submit"
                disabled={replying || !replyText.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 self-end"
              >
                <Send className="w-4 h-4" />
                {replying ? "Sending..." : "Reply"}
              </button>
            </form>
          ) : (
            <div className="p-4 bg-slate-100 text-center text-xs text-slate-500">
              This ticket is closed. Open a new ticket if you need further assistance.
            </div>
          )}
        </div>
      ) : (
        /* Ticket List */
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket subject or #..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading support tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center">
                <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-900">No support tickets found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Everything looks smooth! If you need assistance with mail delivery or DNS setup, feel free to submit a ticket.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTicketDetail(t.id)}
                    className="p-4 sm:p-5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 font-medium">
                          {t.ticketNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">{t.subject}</h4>
                      <p className="text-xs text-slate-500">
                        Updated {new Date(t.updatedAt).toLocaleDateString()} at{" "}
                        {new Date(t.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="flex items-center gap-1 text-xs">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t._count?.messages || 1}</span>
                      </div>
                      <span className="text-slate-300">→</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-indigo-600" />
                Submit Support Ticket
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. DKIM verification error on example.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Priority
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low - General inquiry or feature question</option>
                  <option value="MEDIUM">Medium - Setup assistance or DNS help</option>
                  <option value="HIGH">High - Mail sending or receiving blocked</option>
                  <option value="URGENT">Urgent - Complete domain outage</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Error Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Please describe the issue, affected domain or mailbox, and any error message you are seeing..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
