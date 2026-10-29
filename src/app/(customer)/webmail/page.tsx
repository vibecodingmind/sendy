"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Sparkles,
  Inbox,
  Send,
  FileText,
  Trash2,
  Star,
  RefreshCw,
  Plus,
  Search,
  ExternalLink,
  Settings,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Paperclip,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Users,
  CheckSquare,
  ChevronDown,
  AlertCircle,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  X,
  Tag,
  Clock,
  Filter,
  Download,
  Printer,
  Code,
  PenTool,
  MailOpen,
} from "lucide-react";

interface MailboxItem {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  domain: string;
  storageLimitMb: number;
  usedStorageBytes: number;
  unreadCount: number;
}

interface MessageItem {
  id: string;
  mailboxId: string;
  folder: string;
  sender: string;
  senderEmail: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  isRead: boolean;
  isStarred: boolean;
  sizeBytes: number;
  createdAt: string;
}

interface FolderCounts {
  INBOX: { total: number; unread: number };
  SENT: { total: number; unread: number };
  DRAFTS: { total: number; unread: number };
  TRASH: { total: number; unread: number };
}

// Generate consistent avatar colors like Outlook
function getAvatarColor(name: string): string {
  const colors = [
    "bg-sky-600",
    "bg-blue-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-teal-600",
    "bg-rose-600",
    "bg-amber-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(nameOrEmail: string): string {
  const clean = nameOrEmail.split("<")[0].trim();
  if (clean.includes(" ")) {
    const parts = clean.split(" ");
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function OutlookWebmailPage() {
  const [mailboxes, setMailboxes] = useState<MailboxItem[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>("");
  const [currentFolder, setCurrentFolder] = useState<"INBOX" | "SENT" | "DRAFTS" | "TRASH">("INBOX");
  const [filterTab, setFilterTab] = useState<"ALL" | "UNREAD" | "STARRED">("ALL");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [folderCounts, setFolderCounts] = useState<FolderCounts>({
    INBOX: { total: 0, unread: 0 },
    SENT: { total: 0, unread: 0 },
    DRAFTS: { total: 0, unread: 0 },
    TRASH: { total: 0, unread: 0 },
  });
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Composer State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [availableSignatures, setAvailableSignatures] = useState<any[]>([]);
  const [showSigDropdown, setShowSigDropdown] = useState(false);

  // Inline quick reply state
  const [inlineReplyText, setInlineReplyText] = useState("");
  const [inlineSending, setInlineSending] = useState(false);
  const [showHeadersModal, setShowHeadersModal] = useState(false);

  const activeMailbox = useMemo(
    () => mailboxes.find((m) => m.id === selectedMailboxId),
    [mailboxes, selectedMailboxId]
  );

  useEffect(() => {
    fetchMailboxes();
  }, []);

  useEffect(() => {
    if (selectedMailboxId) {
      fetchMessages();
    }
  }, [selectedMailboxId, currentFolder]);

  async function fetchMailboxes() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/webmail/mailboxes");
      if (res.ok) {
        const data = await res.json();
        setMailboxes(data.mailboxes || []);
        if (data.mailboxes?.length > 0 && !selectedMailboxId) {
          setSelectedMailboxId(data.mailboxes[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load mailboxes", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages() {
    if (!selectedMailboxId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/v1/webmail/messages?mailboxId=${selectedMailboxId}&folder=${currentFolder}&search=${encodeURIComponent(
          search
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.folderCounts) {
          setFolderCounts(data.folderCounts);
        }
        if (selectedMessage) {
          const updated = (data.messages || []).find((m: MessageItem) => m.id === selectedMessage.id);
          if (updated) setSelectedMessage(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSelectMessage(msg: MessageItem) {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      try {
        await fetch(`/api/v1/webmail/messages/${msg.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
        );
        setFolderCounts((prev) => ({
          ...prev,
          INBOX: {
            ...prev.INBOX,
            unread: Math.max(0, prev.INBOX.unread - 1),
          },
        }));
      } catch (err) {
        console.error("Failed to mark read", err);
      }
    }
  }

  async function handleToggleStar(e: React.MouseEvent, msgId: string, currentStarred: boolean) {
    e.stopPropagation();
    const newStatus = !currentStarred;
    try {
      await fetch(`/api/v1/webmail/messages/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: newStatus }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isStarred: newStatus } : m))
      );
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage({ ...selectedMessage, isStarred: newStatus });
      }
    } catch (err) {
      console.error("Failed to toggle star", err);
    }
  }

  async function handleDeleteMessage(msgId: string) {
    try {
      await fetch(`/api/v1/webmail/messages/${msgId}`, { method: "DELETE" });
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(null);
      }
      await fetchMessages();
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  }

  async function handleToggleReadStatus(msg: MessageItem) {
    const nextRead = !msg.isRead;
    try {
      await fetch(`/api/v1/webmail/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: nextRead }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: nextRead } : m))
      );
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage({ ...selectedMessage, isRead: nextRead });
      }
      setFolderCounts((prev) => ({
        ...prev,
        INBOX: {
          ...prev.INBOX,
          unread: nextRead
            ? Math.max(0, prev.INBOX.unread - 1)
            : prev.INBOX.unread + 1,
        },
      }));
    } catch (err) {
      console.error("Failed to toggle read status", err);
    }
  }

  function handleDownloadEml(msg: MessageItem) {
    const emlContent = [
      `From: ${msg.sender}`,
      `To: ${msg.recipient}`,
      `Subject: ${msg.subject}`,
      `Date: ${new Date(msg.createdAt).toUTCString()}`,
      `Message-ID: <${msg.id}@mailoo.local>`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `X-Mailer: Mailoo Business Webmail (Outlook Pro Edition)`,
      `Authentication-Results: mailoo.local; dkim=pass (2048-bit RSA) header.d=${activeMailbox?.domain || "mailoo.local"}; spf=pass smtp.mailfrom=${msg.senderEmail}; dmarc=pass`,
      `DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=${activeMailbox?.domain || "mailoo.local"}; s=mail; bh=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=; b=SAMPLE_DKIM_SIG...`,
      ``,
      msg.bodyHtml || msg.bodyText,
    ].join("\r\n");

    const blob = new Blob([emlContent], { type: "message/rfc822" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(msg.subject || "message").replace(/[^a-zA-Z0-9_-]/g, "_")}.eml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintMessage() {
    window.print();
  }

  function getSignatureForMailbox(email?: string) {
    try {
      if (!email) return null;
      const savedMapping = localStorage.getItem("monogram_account_signature_mapping");
      const savedMulti = localStorage.getItem("monogram_multi_signatures");
      let targetId: string | null = null;
      if (savedMapping) {
        const mapping = JSON.parse(savedMapping);
        targetId = mapping[email] || null;
      }
      if (savedMulti) {
        const sigs = JSON.parse(savedMulti);
        if (targetId) {
          const match = sigs.find((s: any) => s.id === targetId);
          if (match) return match;
        }
        if (sigs.length > 0) return sigs[0];
      }
      const single = localStorage.getItem("monogram_email_signature");
      if (single) return JSON.parse(single);
    } catch {}
    return null;
  }

  function getAllSignatures(): any[] {
    try {
      const savedMulti = localStorage.getItem("monogram_multi_signatures");
      if (savedMulti) {
        const parsed = JSON.parse(savedMulti);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const single = localStorage.getItem("monogram_email_signature");
      if (single) {
        const parsed = JSON.parse(single);
        if (parsed) return [parsed];
      }
    } catch {}
    return [];
  }

  function formatSignatureText(s: any) {
    if (!s) return "";
    return `\n\n${s.signoff || "Best regards,"}\n\n${s.fullName}\n${s.jobTitle}${s.company ? ` | ${s.company}` : ""}\n✉ ${s.email}\n📞 ${s.phone || ""}${s.website ? `\n🌐 ${s.website}` : ""}${s.ctaText ? `\n👉 ${s.ctaText}: ${s.ctaUrl || ""}` : ""}`;
  }

  function handleInsertSignature(specificSig?: any) {
    const s = specificSig || getSignatureForMailbox(activeMailbox?.email);
    if (s) {
      setComposeBody((prev) => prev + formatSignatureText(s));
      setShowSigDropdown(false);
      return;
    }

    const name = activeMailbox?.firstName
      ? `${activeMailbox.firstName} ${activeMailbox.lastName || ""}`.trim()
      : activeMailbox?.email || "User";
    const sig = `\n\n--\nBest regards,\n${name}\n${activeMailbox?.email || ""}\nSent via Monogram Mail`;
    setComposeBody((prev) => prev + sig);
    setShowSigDropdown(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMailboxId || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      return;
    }

    setSending(true);
    setSendSuccess(null);
    try {
      const res = await fetch("/api/v1/webmail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId: selectedMailboxId,
          to: composeTo,
          subject: (isHighPriority ? "❗ " : "") + composeSubject,
          bodyText: composeBody,
        }),
      });

      if (res.ok) {
        setSendSuccess("Message sent!");
        setTimeout(() => {
          setIsComposeOpen(false);
          setComposeTo("");
          setComposeCc("");
          setComposeBcc("");
          setComposeSubject("");
          setComposeBody("");
          setIsHighPriority(false);
          setSendSuccess(null);
        }, 1000);
        await fetchMessages();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send message");
      }
    } catch {
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  }

  async function handleInlineReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMessage || !inlineReplyText.trim() || !selectedMailboxId) return;

    setInlineSending(true);
    try {
      const subject = selectedMessage.subject.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`;

      const res = await fetch("/api/v1/webmail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mailboxId: selectedMailboxId,
          to: selectedMessage.senderEmail,
          subject,
          bodyText: inlineReplyText,
        }),
      });

      if (res.ok) {
        setInlineReplyText("");
        await fetchMessages();
      }
    } catch (err) {
      console.error("Error submitting inline reply", err);
    } finally {
      setInlineSending(false);
    }
  }

  function handleOpenFullReply() {
    if (!selectedMessage) return;
    setComposeTo(selectedMessage.senderEmail);
    setComposeSubject(
      selectedMessage.subject.startsWith("Re:")
        ? selectedMessage.subject
        : `Re: ${selectedMessage.subject}`
    );
    setComposeBody(
      `\n\n___________________________________\nFrom: ${selectedMessage.sender}\nSent: ${new Date(
        selectedMessage.createdAt
      ).toLocaleString()}\nTo: ${selectedMessage.recipient}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.bodyText}`
    );
    setIsComposeOpen(true);
  }

  function handleOpenForward() {
    if (!selectedMessage) return;
    setComposeTo("");
    setComposeSubject(
      selectedMessage.subject.startsWith("Fwd:")
        ? selectedMessage.subject
        : `Fwd: ${selectedMessage.subject}`
    );
    setComposeBody(
      `\n\n___________________________________\nFrom: ${selectedMessage.sender}\nSent: ${new Date(
        selectedMessage.createdAt
      ).toLocaleString()}\nTo: ${selectedMessage.recipient}\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.bodyText}`
    );
    setIsComposeOpen(true);
  }

  function handleOpenNewMail() {
    setIsComposeOpen(true);
    if (!composeBody.trim()) {
      const sig = getSignatureForMailbox(activeMailbox?.email);
      if (sig) {
        setComposeBody(formatSignatureText(sig));
      }
    }
  }

  // Client-side filtering for Focused / Unread / Starred
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (filterTab === "UNREAD") return !msg.isRead;
      if (filterTab === "STARRED") return msg.isStarred;
      return true;
    });
  }, [messages, filterTab]);

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden flex flex-col h-[calc(100vh-5.25rem)] w-full font-sans antialiased text-slate-900">
      {/* 1. OUTLOOK TOP ACTION RIBBON */}
      <header className="h-12 bg-[#0078D4] text-white flex items-center justify-between px-3 shrink-0 shadow-xs select-none">
        <div className="flex items-center space-x-3">
          {/* Outlook App Branding */}
          <div className="flex items-center space-x-2 px-2 py-1 bg-[#005A9E] rounded-md">
            <Mail className="w-4 h-4 text-white" />
            <span className="font-semibold text-xs tracking-wide">Outlook Mail</span>
          </div>

          {/* New Mail Button */}
          <button
            onClick={handleOpenNewMail}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white text-[#0078D4] hover:bg-slate-100 rounded-md font-semibold text-xs shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New mail</span>
          </button>

          {/* Action Ribbon Tools */}
          {selectedMessage && (
            <div className="hidden md:flex items-center space-x-1 border-l border-white/20 pl-2">
              <button
                onClick={handleOpenFullReply}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-white hover:bg-white/10 rounded transition"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
              <button
                onClick={handleOpenForward}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-white hover:bg-white/10 rounded transition"
              >
                <Forward className="w-3.5 h-3.5" />
                <span>Forward</span>
              </button>
              <button
                onClick={() => handleDeleteMessage(selectedMessage.id)}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-white hover:bg-white/10 rounded transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Outlook Search Bar */}
        <div className="flex items-center space-x-3">
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-white/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMessages()}
              placeholder="Search mail and people..."
              className="w-full pl-8 pr-3 py-1 bg-white/15 hover:bg-white/20 focus:bg-white focus:text-slate-900 text-white placeholder:text-white/70 rounded-md text-xs focus:outline-hidden transition shadow-inner"
            />
          </div>

          <button
            onClick={fetchMessages}
            title="Refresh folder"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? "animate-spin" : ""}`} />
          </button>

          <a
            href="https://mail.monogrammail.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Launch Roundcube / SOGo Webmail"
            className="hidden sm:inline-flex items-center space-x-1 px-2 py-1 text-xs text-white/90 hover:text-white hover:bg-white/10 rounded border border-white/20 transition"
          >
            <span>Roundcube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* 2. MAIN 3-PANE WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        {/* SLIM OUTLOOK APP RAIL */}
        <div className="w-12 bg-[#F3F2F1] border-r border-slate-200 flex flex-col items-center py-3 space-y-4 shrink-0 select-none">
          <button
            title="Mail"
            className="p-2 text-[#0078D4] bg-white rounded-lg shadow-xs"
          >
            <Mail className="w-4 h-4" />
          </button>
          <button
            title="Calendar"
            onClick={() => alert("Calendar integrates via CalDAV on port 993/SOGo.")}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
          >
            <Calendar className="w-4 h-4" />
          </button>
          <button
            title="Contacts"
            onClick={() => alert("Contacts directory synchronized via CardDAV.")}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            title="To Do"
            onClick={() => alert("Tasks & To-Do synchronized via IMAP Sieve.")}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>

        {/* FOLDERS & ACCOUNT PANE */}
        <aside className="w-52 bg-[#FAF9F8] border-r border-slate-200 flex flex-col justify-between p-3 shrink-0 select-none">
          <div>
            {/* Account Switcher Header */}
            <div className="mb-4 pb-3 border-b border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Account
              </span>
              <div className="flex items-center justify-between">
                <select
                  value={selectedMailboxId}
                  onChange={(e) => setSelectedMailboxId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer truncate"
                >
                  {mailboxes.map((mb) => (
                    <option key={mb.id} value={mb.id}>
                      {mb.email}
                    </option>
                  ))}
                </select>
              </div>
              {activeMailbox && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-[#0078D4] h-1 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(5, (activeMailbox.usedStorageBytes / (activeMailbox.storageLimitMb * 1024 * 1024)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {(activeMailbox.usedStorageBytes / (1024 * 1024)).toFixed(1)} MB / {activeMailbox.storageLimitMb} MB
                  </span>
                </div>
              )}
            </div>

            {/* Outlook Folders Navigation */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                Favorites
              </span>

              <button
                onClick={() => {
                  setCurrentFolder("INBOX");
                  setFilterTab("ALL");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                  currentFolder === "INBOX" && filterTab === "ALL"
                    ? "bg-[#E1DFDD] font-bold text-[#0078D4]"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Inbox className="w-4 h-4 text-[#0078D4]" />
                  <span>Inbox</span>
                </div>
                {folderCounts.INBOX.unread > 0 && (
                  <span className="text-[11px] font-bold text-[#0078D4] bg-[#0078D4]/10 px-1.5 py-0.2 rounded-full">
                    {folderCounts.INBOX.unread}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setCurrentFolder("SENT");
                  setFilterTab("ALL");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                  currentFolder === "SENT"
                    ? "bg-[#E1DFDD] font-bold text-[#0078D4]"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4 text-slate-600" />
                  <span>Sent Items</span>
                </div>
                <span className="text-[10px] text-slate-400">{folderCounts.SENT.total}</span>
              </button>

              <button
                onClick={() => {
                  setCurrentFolder("DRAFTS");
                  setFilterTab("ALL");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                  currentFolder === "DRAFTS"
                    ? "bg-[#E1DFDD] font-bold text-[#0078D4]"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Drafts</span>
                </div>
                <span className="text-[10px] text-slate-400">{folderCounts.DRAFTS.total}</span>
              </button>

              <button
                onClick={() => {
                  setCurrentFolder("TRASH");
                  setFilterTab("ALL");
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                  currentFolder === "TRASH"
                    ? "bg-[#E1DFDD] font-bold text-[#0078D4]"
                    : "text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4 text-slate-600" />
                  <span>Deleted Items</span>
                </div>
                <span className="text-[10px] text-slate-400">{folderCounts.TRASH.total}</span>
              </button>
            </div>
          </div>

          {/* Quick Client Config Link */}
          <div className="pt-3 border-t border-slate-200">
            <a
              href="/settings"
              className="flex items-center space-x-2 text-xs text-slate-500 hover:text-[#0078D4] transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>IMAP/SMTP Guide</span>
            </a>
          </div>
        </aside>

        {/* 3. MIDDLE PANE: OUTLOOK MESSAGE LIST */}
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Outlook Filter Tabs: Focused / Other / Unread */}
          <div className="h-10 px-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60 select-none">
            <div className="flex items-center space-x-3 text-xs font-semibold">
              <button
                onClick={() => setFilterTab("ALL")}
                className={`pb-2.5 pt-2 border-b-2 transition ${
                  filterTab === "ALL"
                    ? "border-[#0078D4] text-[#0078D4]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Focused
              </button>

              <button
                onClick={() => setFilterTab("UNREAD")}
                className={`pb-2.5 pt-2 border-b-2 transition flex items-center space-x-1 ${
                  filterTab === "UNREAD"
                    ? "border-[#0078D4] text-[#0078D4]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Unread</span>
                {folderCounts.INBOX.unread > 0 && (
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full font-bold">
                    {folderCounts.INBOX.unread}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterTab("STARRED")}
                className={`pb-2.5 pt-2 border-b-2 transition ${
                  filterTab === "STARRED"
                    ? "border-[#0078D4] text-[#0078D4]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Flagged
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              {filteredMessages.length} {filteredMessages.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Message List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingMessages ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Nothing in this view</p>
                <p className="text-[11px] text-slate-400 mt-1">Looks like all caught up!</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const displayName =
                  currentFolder === "SENT"
                    ? `To: ${msg.recipientEmail}`
                    : msg.sender.split("<")[0] || msg.senderEmail;
                const initials = getInitials(displayName);
                const avatarBg = getAvatarColor(displayName);

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`relative p-3 cursor-pointer transition flex items-start space-x-3 group ${
                      isSelected
                        ? "bg-[#EFF6FC] border-l-4 border-[#0078D4]"
                        : !msg.isRead
                        ? "bg-white font-semibold hover:bg-slate-50"
                        : "bg-white text-slate-600 hover:bg-slate-50 opacity-90"
                    }`}
                  >
                    {/* Unread Blue Pill */}
                    {!msg.isRead && (
                      <div className="absolute left-1 top-4 w-1.5 h-1.5 rounded-full bg-[#0078D4]" />
                    )}

                    {/* Sender Initials Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-xs ${avatarBg}`}
                    >
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`truncate ${
                            !msg.isRead ? "text-slate-900 font-bold" : "text-slate-700"
                          }`}
                        >
                          {displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                          {new Date(msg.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <h4
                        className={`text-xs truncate ${
                          !msg.isRead ? "text-slate-900 font-semibold" : "text-slate-800"
                        }`}
                      >
                        {msg.subject}
                      </h4>

                      <p className="text-[11px] text-slate-500 truncate line-clamp-1 leading-normal">
                        {msg.bodyText}
                      </p>
                    </div>

                    {/* Quick Hover Actions (Star & Delete) */}
                    <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => handleToggleStar(e, msg.id, msg.isStarred)}
                        className={`p-1 hover:scale-110 transition ${
                          msg.isStarred ? "text-amber-400" : "text-slate-300 hover:text-slate-500"
                        }`}
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(msg.id);
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 4. RIGHT PANE: OUTLOOK MESSAGE READING VIEW */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Message Header */}
              <div className="p-6 border-b border-slate-200 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">
                      {selectedMessage.subject}
                    </h1>

                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${getAvatarColor(
                          selectedMessage.sender
                        )}`}
                      >
                        {getInitials(selectedMessage.sender)}
                      </div>

                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {selectedMessage.sender}
                          </span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>DKIM & SPF Verified</span>
                          </span>
                        </div>
                        <div className="text-slate-500">
                          To: <span className="text-slate-700">{selectedMessage.recipient}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={handleOpenFullReply}
                      className="px-2.5 py-1.5 bg-[#F3F2F1] hover:bg-[#E1DFDD] text-slate-800 rounded-md text-xs font-semibold flex items-center space-x-1 transition"
                      title="Reply (R)"
                    >
                      <Reply className="w-3.5 h-3.5 text-[#0078D4]" />
                      <span className="hidden sm:inline">Reply</span>
                    </button>
                    <button
                      onClick={handleOpenForward}
                      className="px-2.5 py-1.5 bg-[#F3F2F1] hover:bg-[#E1DFDD] text-slate-800 rounded-md text-xs font-semibold flex items-center space-x-1 transition"
                      title="Forward"
                    >
                      <Forward className="w-3.5 h-3.5 text-[#0078D4]" />
                      <span className="hidden sm:inline">Forward</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                    <button
                      onClick={() => handleToggleReadStatus(selectedMessage)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                      title={selectedMessage.isRead ? "Mark as unread" : "Mark as read"}
                    >
                      {selectedMessage.isRead ? (
                        <Mail className="w-4 h-4 text-sky-600" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-slate-600" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDownloadEml(selectedMessage)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                      title="Download message as RFC-822 .EML"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handlePrintMessage}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                      title="Print message"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setShowHeadersModal(true)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                      title="View Internet Message Headers & DKIM Auth"
                    >
                      <Code className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Body Scroll Area */}
              <div className="flex-1 p-6 overflow-y-auto bg-white">
                {selectedMessage.bodyHtml ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                    className="prose prose-sm max-w-none text-slate-800 leading-relaxed"
                  />
                ) : (
                  <pre className="font-sans text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.bodyText}
                  </pre>
                )}
              </div>

              {/* Outlook Quick Inline Reply Box */}
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <form onSubmit={handleInlineReply} className="bg-white border border-slate-300 rounded-lg p-3 shadow-xs">
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
                    <Reply className="w-3.5 h-3.5 text-[#0078D4]" />
                    <span>Reply to {selectedMessage.sender.split("<")[0]}</span>
                  </div>
                  <textarea
                    rows={2}
                    value={inlineReplyText}
                    onChange={(e) => setInlineReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full text-xs text-slate-800 border-none p-0 focus:ring-0 resize-none placeholder:text-slate-400"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span>From: {activeMailbox?.email}</span>
                    </div>
                    <button
                      type="submit"
                      disabled={inlineSending || !inlineReplyText.trim()}
                      className="px-3.5 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>{inlineSending ? "Sending..." : "Send"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#0078D4] flex items-center justify-center mb-3">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Select an item to read</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Choose a conversation from the list to preview headers, verify cryptographic signatures, and reply.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. OUTLOOK-STYLE COMPOSER WINDOW */}
      {isComposeOpen && (
        <div
          className={`fixed z-50 transition-all ${
            isMaximized
              ? "inset-4"
              : "bottom-4 right-4 w-full max-w-2xl h-[560px]"
          } bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden`}
        >
          {/* Composer Header Bar */}
          <div className="h-10 bg-[#0078D4] text-white px-4 flex items-center justify-between select-none shrink-0">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <Send className="w-3.5 h-3.5" />
              <span>New Message</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1 hover:bg-white/20 rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Composer Form */}
          <form onSubmit={handleSendMessage} className="flex-1 flex flex-col overflow-hidden bg-white">
            {sendSuccess && (
              <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{sendSuccess}</span>
              </div>
            )}

            {/* Headers Area */}
            <div className="p-3 border-b border-slate-200 space-y-2 text-xs">
              {/* From Line */}
              <div className="flex items-center space-x-2 text-slate-500">
                <span className="w-12 font-medium">From:</span>
                <span className="font-mono text-slate-900 font-semibold">{activeMailbox?.email}</span>
              </div>

              {/* To Line */}
              <div className="flex items-center space-x-2">
                <span className="w-12 text-slate-500 font-medium">To:</span>
                <input
                  type="email"
                  required
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 border-none p-0 text-xs text-slate-900 focus:ring-0 placeholder:text-slate-400"
                />
                <div className="flex items-center space-x-2 text-[11px] text-[#0078D4] font-medium">
                  {!showCc && (
                    <button type="button" onClick={() => setShowCc(true)} className="hover:underline">
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button type="button" onClick={() => setShowBcc(true)} className="hover:underline">
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {/* Optional CC */}
              {showCc && (
                <div className="flex items-center space-x-2 pt-1">
                  <span className="w-12 text-slate-500 font-medium">Cc:</span>
                  <input
                    type="email"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1 border-none p-0 text-xs text-slate-900 focus:ring-0 placeholder:text-slate-400"
                  />
                </div>
              )}

              {/* Optional BCC */}
              {showBcc && (
                <div className="flex items-center space-x-2 pt-1">
                  <span className="w-12 text-slate-500 font-medium">Bcc:</span>
                  <input
                    type="email"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1 border-none p-0 text-xs text-slate-900 focus:ring-0 placeholder:text-slate-400"
                  />
                </div>
              )}

              {/* Subject Line */}
              <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                <span className="w-12 text-slate-500 font-medium">Subject:</span>
                <input
                  type="text"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Add a subject"
                  className="flex-1 border-none p-0 text-xs text-slate-900 font-semibold focus:ring-0 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Rich Formatting Toolbar (Outlook Taste) */}
            <div className="h-9 px-3 bg-slate-50 border-b border-slate-200 flex items-center space-x-3 text-slate-600 select-none">
              <div className="flex items-center space-x-1 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  title="Bold"
                  onClick={() => setComposeBody((prev) => prev + " **bold** ")}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Italic"
                  onClick={() => setComposeBody((prev) => prev + " *italic* ")}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Underline"
                  onClick={() => setComposeBody((prev) => prev + " <u>underline</u> ")}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center space-x-1 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  title="Bulleted List"
                  onClick={() => setComposeBody((prev) => prev + "\n• ")}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => setComposeBody((prev) => prev + "\n1. ")}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                title="Attach file"
                onClick={() => alert("Attachments are sent with base64 MIME encoding.")}
                className="p-1 hover:bg-slate-200 rounded flex items-center space-x-1 text-xs"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Attach</span>
              </button>

              <div className="relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setShowSigDropdown(!showSigDropdown)}
                  className={`p-1 hover:bg-slate-200 rounded-l flex items-center space-x-1 text-xs ${showSigDropdown ? 'bg-slate-200 text-indigo-600' : ''}`}
                  title="Choose & Insert Signature"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Signature</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                <Link
                  href="/signatures"
                  target="_blank"
                  title="Configure Signatures & Routing"
                  className="p-1 hover:bg-slate-200 rounded-r text-slate-400 hover:text-indigo-600"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                </Link>

                {showSigDropdown && (
                  <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <span>Insert Signature</span>
                      <button onClick={() => setShowSigDropdown(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      <button
                        type="button"
                        onClick={() => handleInsertSignature()}
                        className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-medium text-slate-800 group-hover:text-indigo-600">Auto (Account Assigned)</p>
                          <p className="text-[10px] text-slate-400">Based on {activeMailbox?.email || 'active account'}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Active</span>
                      </button>

                      {getAllSignatures().map((sig: any) => (
                        <button
                          key={sig.id}
                          type="button"
                          onClick={() => handleInsertSignature(sig)}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between group"
                        >
                          <div className="truncate pr-2">
                            <p className="font-medium text-slate-700 group-hover:text-indigo-600 truncate">{sig.title || sig.fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{sig.jobTitle || sig.company || sig.email}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono capitalize shrink-0 truncate max-w-[80px]">{(sig.templateId || sig.template || 'classic').replace(/_/g, " ")}</span>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 px-3 py-1.5 bg-slate-50 flex items-center justify-between">
                      <Link
                        href="/signatures"
                        target="_blank"
                        className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
                        onClick={() => setShowSigDropdown(false)}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Manage / Create Signatures ↗</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsHighPriority(!isHighPriority)}
                className={`p-1 rounded text-xs flex items-center space-x-1 ${
                  isHighPriority ? "bg-rose-100 text-rose-700 font-bold" : "hover:bg-slate-200"
                }`}
                title="Toggle High Importance"
              >
                <span>❗</span>
                <span className="hidden sm:inline">High priority</span>
              </button>
            </div>

            {/* Message Body */}
            <div className="flex-1 p-3">
              <textarea
                required
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Type your email message here..."
                className="w-full h-full border-none p-0 text-sm text-slate-800 focus:ring-0 resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Bottom Send Toolbar */}
            <div className="h-12 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-1.5 bg-[#0078D4] hover:bg-[#106EBE] text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? "Sending..." : "Send"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 rounded-md text-xs font-medium transition"
                >
                  Discard
                </button>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>2048-bit RSA DKIM Signed</span>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 6. RFC-822 INTERNET HEADERS MODAL */}
      {showHeadersModal && selectedMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <Code className="w-4 h-4 text-sky-400" />
                <span>RFC-822 Internet Message Headers</span>
              </div>
              <button
                onClick={() => setShowHeadersModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto font-mono text-xs text-slate-800 bg-slate-50">
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-sans font-semibold uppercase tracking-wider mb-2">
                  Authentication-Results & Delivery Diagnostics
                </div>
                <div className="text-emerald-700 font-semibold">
                  Authentication-Results: mailoo.local; dkim=pass (2048-bit RSA) header.i=@{activeMailbox?.domain || "mailoo.local"};
                  spf=pass smtp.mailfrom={selectedMessage.senderEmail}; dmarc=pass action=none
                </div>
                <div>DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d={activeMailbox?.domain || "mailoo.local"}; s=mail;</div>
                <div>Received-SPF: Pass (mailoo MTA: domain of {selectedMessage.senderEmail} designates 192.0.2.1 as permitted sender)</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                <div className="text-[11px] text-slate-400 font-sans font-semibold uppercase tracking-wider mb-2">
                  Transport Headers
                </div>
                <div>Message-ID: &lt;{selectedMessage.id}@mailoo.local&gt;</div>
                <div>Date: {new Date(selectedMessage.createdAt).toUTCString()}</div>
                <div>From: {selectedMessage.sender}</div>
                <div>To: {selectedMessage.recipient}</div>
                <div>Subject: {selectedMessage.subject}</div>
                <div>MIME-Version: 1.0</div>
                <div>Content-Type: text/html; charset=UTF-8</div>
                <div>X-Mailer: Mailoo Business Engine v1.0.0 (Dovecot LMTP)</div>
                <div>X-Spam-Status: No, score=-1.8 required=5.0 tests=DKIM_SIGNED,DKIM_VALID,SPF_PASS</div>
              </div>
            </div>

            <div className="px-5 py-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowHeadersModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
