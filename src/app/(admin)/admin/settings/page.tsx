"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sliders, CheckCircle2, AlertTriangle, Save, CreditCard, ArrowRight } from "lucide-react";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    APP_NAME: "",
    SUPPORT_EMAIL: "",
    MAIL_WEBMAIL_URL: "",
    MAIL_IMAP_HOST: "",
    MAIL_IMAP_PORT: "993",
    MAIL_SMTP_HOST: "",
    MAIL_SMTP_PORT: "465",
    MAIL_MX_HOST: "",
    MAIL_MX_PRIORITY: "10",
    MAIL_DKIM_SELECTOR: "default",
    DNS_NAMESERVER_1: "ns1.monogrammail.com",
    DNS_NAMESERVER_2: "ns2.monogrammail.com",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          const s = data.settings;
          setForm({
            APP_NAME: s.appName || "Monogram Mail",
            SUPPORT_EMAIL: s.supportEmail || "support@monogrammail.com",
            MAIL_WEBMAIL_URL: s.mailWebmailUrl || "https://mail.monogrammail.com",
            MAIL_IMAP_HOST: s.mailImapHost || "imap.monogrammail.com",
            MAIL_IMAP_PORT: String(s.mailImapPort || 993),
            MAIL_SMTP_HOST: s.mailSmtpHost || "smtp.monogrammail.com",
            MAIL_SMTP_PORT: String(s.mailSmtpPort || 465),
            MAIL_MX_HOST: s.mailMxHost || "mx1.monogrammail.com",
            MAIL_MX_PRIORITY: String(s.mailMxPriority || 10),
            MAIL_DKIM_SELECTOR: s.mailDkimSelector || "default",
            DNS_NAMESERVER_1: s.mailNs1 || "ns1.monogrammail.com",
            DNS_NAMESERVER_2: s.mailNs2 || "ns2.monogrammail.com",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage("System settings successfully updated across all tenants.");
      } else {
        alert("Failed to save settings");
      }
    } catch {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform & Brand Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure centralized branding, DNS templates, and mail cluster endpoint hostnames.
        </p>
      </div>

      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Payment Gateways &amp; Billing API</h4>
            <p className="text-xs text-slate-400">Configure AzamPay Mobile Money, Stripe, and webhook secrets in the Payment Gateways panel.</p>
          </div>
        </div>
        <Link
          href="/admin/payment-gateways"
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0"
        >
          <span>Manage Gateways</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Branding & Identity</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Brand Name</label>
              <input
                type="text"
                required
                value={form.APP_NAME}
                onChange={(e) => setForm({ ...form, APP_NAME: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Support Email Address</label>
              <input
                type="email"
                required
                value={form.SUPPORT_EMAIL}
                onChange={(e) => setForm({ ...form, SUPPORT_EMAIL: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>

        {/* Mail Hostnames */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Mail Hostnames & DNS Template</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Webmail Client URL</label>
              <input
                type="url"
                required
                value={form.MAIL_WEBMAIL_URL}
                onChange={(e) => setForm({ ...form, MAIL_WEBMAIL_URL: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">IMAP Hostname</label>
              <input
                type="text"
                required
                value={form.MAIL_IMAP_HOST}
                onChange={(e) => setForm({ ...form, MAIL_IMAP_HOST: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">IMAP Port (SSL/TLS)</label>
              <input
                type="number"
                required
                value={form.MAIL_IMAP_PORT}
                onChange={(e) => setForm({ ...form, MAIL_IMAP_PORT: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">SMTP Hostname</label>
              <input
                type="text"
                required
                value={form.MAIL_SMTP_HOST}
                onChange={(e) => setForm({ ...form, MAIL_SMTP_HOST: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">SMTP Port (SSL/TLS)</label>
              <input
                type="number"
                required
                value={form.MAIL_SMTP_PORT}
                onChange={(e) => setForm({ ...form, MAIL_SMTP_PORT: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Primary MX Hostname</label>
              <input
                type="text"
                required
                value={form.MAIL_MX_HOST}
                onChange={(e) => setForm({ ...form, MAIL_MX_HOST: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">MX Priority</label>
              <input
                type="number"
                required
                value={form.MAIL_MX_PRIORITY}
                onChange={(e) => setForm({ ...form, MAIL_MX_PRIORITY: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Primary Nameserver (NS1)</label>
              <input
                type="text"
                required
                value={form.DNS_NAMESERVER_1}
                onChange={(e) => setForm({ ...form, DNS_NAMESERVER_1: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                placeholder="ns1.monogrammail.com"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Secondary Nameserver (NS2)</label>
              <input
                type="text"
                required
                value={form.DNS_NAMESERVER_2}
                onChange={(e) => setForm({ ...form, DNS_NAMESERVER_2: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                placeholder="ns2.monogrammail.com"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg shadow-xs disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
