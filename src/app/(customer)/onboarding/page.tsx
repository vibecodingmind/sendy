"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  Globe,
  Radio,
  Mail,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Inbox,
  ChevronRight,
  Server,
  Layers,
  HelpCircle,
  Zap,
} from "lucide-react";

interface DnsRecord {
  type: string;
  host: string;
  value: string;
  priority?: number;
  description?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [domainInput, setDomainInput] = useState("");
  const [createdDomain, setCreatedDomain] = useState<{ id: string; name: string } | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<Record<string, DnsRecord> | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [dnsVerified, setDnsVerified] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Mailbox setup state
  const [mailboxInput, setMailboxInput] = useState({
    username: "admin",
    password: "",
    firstName: "John",
    lastName: "Doe",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [provisioningMailbox, setProvisioningMailbox] = useState(false);
  const [createdMailboxEmail, setCreatedMailboxEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [onboardingDnsTab, setOnboardingDnsTab] = useState<"nameservers" | "manual">("nameservers");
  const [wizardNs, setWizardNs] = useState<{ ns1: string; ns2: string }>({
    ns1: "ns1.monogrammail.com",
    ns2: "ns2.monogrammail.com",
  });

  const steps = [
    { num: 1, title: "Plan & Org" },
    { num: 2, title: "Domain" },
    { num: 3, title: "DNS Config" },
    { num: 4, title: "Verification" },
    { num: 5, title: "Mailbox" },
    { num: 6, title: "Launch!" },
  ];

  // Map internal 1-7 steps to 6 clean visual steps
  const getVisualStep = () => {
    if (currentStep <= 2) return 1;
    if (currentStep === 3) return 2;
    if (currentStep === 4) return 3;
    if (currentStep === 5) return 4;
    if (currentStep === 6) return 5;
    return 6;
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateSecurePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~";
    let pwd = "";
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMailboxInput((prev) => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    let cleanedDomain = domainInput.trim().toLowerCase();
    cleanedDomain = cleanedDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    if (!cleanedDomain || !cleanedDomain.includes(".")) {
      setErrorMsg("Please enter a valid domain name (e.g. acmebrand.com)");
      return;
    }

    try {
      const res = await fetch("/api/v1/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: cleanedDomain }),
      });
      const data = await res.json();
      if (res.ok && data.domain) {
        setCreatedDomain(data.domain);
        setDnsInstructions(data.dnsInstructions);
        if (data.nameservers) {
          setWizardNs(data.nameservers);
        }
        setCurrentStep(4);
      } else {
        setErrorMsg(data.error || "Failed to add domain. Please try again.");
      }
    } catch {
      setErrorMsg("Error connecting to server. Please try again.");
    }
  };

  const handleVerifyDns = async () => {
    if (!createdDomain) return;
    setVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/domains/${createdDomain.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.isVerified) {
        setDnsVerified(true);
        setCurrentStep(6);
      } else {
        // DNS may be propagating, let user proceed or retry
        setCurrentStep(6);
      }
    } catch {
      setCurrentStep(6);
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdDomain || !mailboxInput.username || !mailboxInput.password) return;
    setErrorMsg(null);
    setProvisioningMailbox(true);

    try {
      const res = await fetch("/api/v1/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: createdDomain.id,
          username: mailboxInput.username.trim().toLowerCase(),
          password: mailboxInput.password,
          firstName: mailboxInput.firstName,
          lastName: mailboxInput.lastName,
          storageLimitMb: 10240,
        }),
      });
      const data = await res.json();
      if (res.ok && data.mailbox) {
        setCreatedMailboxEmail(data.mailbox.email);
        setCurrentStep(7);
      } else {
        setErrorMsg(data.error || "Failed to create mailbox.");
      }
    } catch {
      setErrorMsg("Network error provisioning mailbox.");
    } finally {
      setProvisioningMailbox(false);
    }
  };

  const visualStep = getVisualStep();

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8">
      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-50/80 border border-indigo-200/80 rounded-full text-indigo-700 text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Interactive Onboarding</span>
          <span className="text-indigo-400">|</span>
          <span className="text-indigo-600">Carrier-Grade Setup</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Configure Your Business Email
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Connect your custom domain, set up DNS deliverability records, and provision your first carrier-grade mailbox.
        </p>
      </div>

      {/* ── Stepper Navigation ── */}
      <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-6 gap-2">
          {steps.map((s) => {
            const isCompleted = visualStep > s.num;
            const isCurrent = visualStep === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center text-center group">
                <div className="flex items-center justify-center w-full relative mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-xs"
                        : isCurrent
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md shadow-indigo-500/25"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold hidden sm:block ${
                    isCurrent
                      ? "text-indigo-700 font-bold"
                      : isCompleted
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Smooth Stepper Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 sm:mt-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((visualStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step Content Cards ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs">
        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* ── STEP 1 & 2: Organization & Plan Ready ── */}
        {currentStep <= 2 && (
          <div className="space-y-8 text-center max-w-lg mx-auto">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-lg animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                Step 1 of 6: Account Ready
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">Organization Provisioned</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your customer tenant has been provisioned with enterprise Postfix/Dovecot storage nodes. Next, let&apos;s link your business domain.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-3 gap-3 text-left">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <Globe className="w-4 h-4 text-indigo-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800">Custom Domains</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Bring any TLD</p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800">SPF / DKIM / DMARC</p>
                <p className="text-[11px] text-slate-500 mt-0.5">10/10 Score</p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <Server className="w-4 h-4 text-purple-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-800">Isolated Storage</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Encrypted at rest</p>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep(3)}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Connect Your Domain</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 3: Connect Domain ── */}
        {currentStep === 3 && (
          <form onSubmit={handleCreateDomain} className="space-y-6 max-w-lg mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                <Globe className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Connect Your Domain</h2>
              <p className="text-xs text-slate-500">
                Enter your company or organization domain name that you want to send and receive emails from.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Domain Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="acmebrand.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Do not include <code className="text-slate-600 font-mono">http://</code> or <code className="text-slate-600 font-mono">www.</code>
              </p>
            </div>

            {/* Registrar Quick Links */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-semibold text-slate-600">Supported Registrars:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {["Cloudflare", "GoDaddy", "Namecheap", "Route 53", "Hostinger", "Google Domains"].map(
                  (reg) => (
                    <span
                      key={reg}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-600 font-medium"
                    >
                      {reg}
                    </span>
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Add Domain & Generate DNS Keys</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* ── STEP 4: Configure DNS / Nameservers ── */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center space-y-1.5 max-w-lg mx-auto">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-2">
                <Radio className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Connect DNS for {createdDomain?.name || "Your Domain"}
              </h2>
              <p className="text-xs text-slate-500">
                Choose the 1-step automated Nameserver setup (recommended like Cloudflare) or add manual DNS records.
              </p>
            </div>

            {/* Method Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-fit mx-auto">
              <button
                type="button"
                onClick={() => setOnboardingDnsTab("nameservers")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  onboardingDnsTab === "nameservers"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Method 1: Nameservers (Recommended)</span>
              </button>
              <button
                type="button"
                onClick={() => setOnboardingDnsTab("manual")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  onboardingDnsTab === "manual"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Method 2: Manual DNS</span>
              </button>
            </div>

            {/* Method 1: Nameservers */}
            {onboardingDnsTab === "nameservers" && (
              <div className="bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    1-Step Setup
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Replace Nameservers at your registrar (GoDaddy, Namecheap, etc.)
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Switch your domain to <strong>Custom Nameservers</strong> and paste our two addresses below. Our cloud automatically generates and maintains MX, SPF, DKIM, and DMARC for you!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-sans font-bold text-slate-400 block uppercase">Primary Nameserver</span>
                    <div className="flex items-center justify-between text-indigo-700 font-bold text-sm">
                      <span>{wizardNs.ns1}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(wizardNs.ns1, "ns1")}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                      >
                        {copiedKey === "ns1" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-sans font-bold text-slate-400 block uppercase">Secondary Nameserver</span>
                    <div className="flex items-center justify-between text-indigo-700 font-bold text-sm">
                      <span>{wizardNs.ns2}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(wizardNs.ns2, "ns2")}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                      >
                        {copiedKey === "ns2" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-[11px] text-slate-500">
                  💡 <strong>Tip:</strong> In GoDaddy or Namecheap, open your domain portfolio, click <em>Nameservers</em>, select <em>Custom Nameservers</em>, and paste these two values.
                </div>
              </div>
            )}

            {/* Method 2: Manual DNS Records */}
            {onboardingDnsTab === "manual" && dnsInstructions && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Use this if your domain already has an active website (e.g. Shopify, Webflow) and you only want to route email through our servers.
                </div>
                {Object.entries(dnsInstructions).map(([key, r]) => (
                  <div
                    key={key}
                    className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono text-[11px] font-bold rounded">
                          {r.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 capitalize">
                          {key.toUpperCase()} Record
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(r.value, key)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
                      >
                        {copiedKey === key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Value</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Host / Name:</span>
                        <span className="text-slate-800 select-all font-semibold">{r.host}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200 sm:col-span-2">
                        <span className="text-[10px] text-slate-400 font-sans block">Value / Target:</span>
                        <span className="text-slate-800 break-all select-all">{r.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setCurrentStep(5)}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>I Have Saved These Settings &gt; Verify Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── STEP 5: Verify DNS Records ── */}
        {currentStep === 5 && (
          <div className="space-y-8 text-center max-w-lg mx-auto py-4">
            <div className="relative mx-auto w-20 h-20">
              <div
                className={`absolute inset-0 bg-indigo-500/20 rounded-full blur-xl ${
                  verifying ? "animate-pulse" : ""
                }`}
              />
              <div className="relative w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <RefreshCw className={`w-9 h-9 ${verifying ? "animate-spin text-indigo-600" : ""}`} />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">Verify DNS Propagation</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Querying root DNS resolvers for MX routing, SPF anti-spoofing policy, and cryptographic DKIM selector keys for{" "}
                <span className="font-semibold text-slate-800">{createdDomain?.name}</span>.
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="font-medium text-slate-700">MX Mail Routing Record</span>
                <span className="text-indigo-600 font-semibold font-mono text-[11px]">Ready to Query</span>
              </div>
              <div className="flex items-center justify-between py-1 border-t border-slate-200">
                <span className="font-medium text-slate-700">SPF Authenticated Sender TXT</span>
                <span className="text-indigo-600 font-semibold font-mono text-[11px]">Ready to Query</span>
              </div>
              <div className="flex items-center justify-between py-1 border-t border-slate-200">
                <span className="font-medium text-slate-700">DKIM RSA-2048 Public Key</span>
                <span className="text-indigo-600 font-semibold font-mono text-[11px]">Ready to Query</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleVerifyDns}
                disabled={verifying}
                className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resolving DNS...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run Verification Check</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setCurrentStep(6)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Skip / Continue Provisioning
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 6: Create First Mailbox ── */}
        {currentStep === 6 && (
          <form onSubmit={handleCreateMailbox} className="space-y-6 max-w-lg mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Create Your First Mailbox</h2>
              <p className="text-xs text-slate-500">
                Choose the user prefix and password for your primary business email address.
              </p>
            </div>

            {/* Live Mailbox Pill Preview */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-2xl border border-indigo-200/80 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Your Email Address Will Be:
              </span>
              <span className="font-mono text-base font-bold text-indigo-900">
                {mailboxInput.username || "username"}@{createdDomain?.name || "yourdomain.com"}
              </span>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={mailboxInput.firstName}
                  onChange={(e) => setMailboxInput({ ...mailboxInput, firstName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={mailboxInput.lastName}
                  onChange={(e) => setMailboxInput({ ...mailboxInput, lastName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            {/* Email Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username / Prefix</label>
              <div className="flex">
                <input
                  type="text"
                  required
                  placeholder="john or admin"
                  value={mailboxInput.username}
                  onChange={(e) => setMailboxInput({ ...mailboxInput, username: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-r-0 border-slate-300 rounded-l-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                />
                <span className="inline-flex items-center px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-100 border border-slate-300 rounded-r-xl text-slate-600">
                  @{createdDomain?.name || "yourdomain.com"}
                </span>
              </div>
            </div>

            {/* Password with Generator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={generateSecurePassword}
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Generate Strong Password</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Min 8 characters"
                  value={mailboxInput.password}
                  onChange={(e) => setMailboxInput({ ...mailboxInput, password: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={provisioningMailbox}
              className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2"
            >
              {provisioningMailbox ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Provisioning Mailbox on Cluster...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Create Mailbox & Complete Setup</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 7: Ready / Celebration ── */}
        {currentStep === 7 && (
          <div className="space-y-8 text-center max-w-lg mx-auto py-2">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-10 h-10" />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Setup Complete!
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Your Email Infrastructure Is Active
              </h2>
              <p className="font-mono text-base font-bold text-indigo-600 mt-2">
                {createdMailboxEmail}
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Your mailbox has been securely provisioned with 10 GB encrypted storage. You can immediately send & receive emails or connect your desktop/mobile mail apps.
              </p>
            </div>

            {/* Quick Action Launchpad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Link
                href="/webmail"
                className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-600/20 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-1.5 font-bold text-sm">
                    <Inbox className="w-4 h-4" />
                    <span>Open Webmail</span>
                  </div>
                  <p className="text-[11px] text-indigo-100 mt-0.5">Inbox, Calendar, & Contacts</p>
                </div>
                <ChevronRight className="w-5 h-5 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/settings"
                className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl border border-slate-200 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-1.5 font-bold text-sm">
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    <span>IMAP & SMTP Setup</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Outlook, Apple Mail, iOS</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/dashboard"
                className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Return to Organization Dashboard →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
