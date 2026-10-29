"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Radio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Server,
  Zap,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DnsCheckItem {
  valid: boolean;
  expected: string;
  detected: string[];
  message?: string;
}

interface DnsResults {
  overallValid: boolean;
  isDelegatedNs?: boolean;
  ns?: DnsCheckItem;
  mx: DnsCheckItem;
  spf: DnsCheckItem;
  dkim: DnsCheckItem;
  dmarc: DnsCheckItem;
}

interface DomainData {
  id: string;
  name: string;
  status: string;
  isVerified: boolean;
  isManagedDns?: boolean;
  dkimSelector: string;
}

function DnsSetupContent() {
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get("domain");

  const [domains, setDomains] = useState<DomainData[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainData | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<Record<string, { type: string; host: string; value: string; priority?: number }> | null>(null);
  const [nameservers, setNameservers] = useState<{ ns1: string; ns2: string }>({
    ns1: "ns1.monogrammail.com",
    ns2: "ns2.monogrammail.com",
  });
  const [verification, setVerification] = useState<DnsResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeSetupTab, setActiveSetupTab] = useState<"nameservers" | "manual">("nameservers");
  const [showRegistrarHelp, setShowRegistrarHelp] = useState(false);

  useEffect(() => {
    fetch("/api/v1/domains")
      .then((r) => (r.ok ? r.json() : { domains: [] }))
      .then((data) => {
        const domList = data.domains || [];
        setDomains(domList);
        if (domList.length > 0) {
          const match = initialDomain ? domList.find((d: DomainData) => d.name === initialDomain) : domList[0];
          setSelectedDomain(match || domList[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [initialDomain]);

  useEffect(() => {
    if (!selectedDomain) return;

    fetch(`/api/v1/domains/${selectedDomain.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setDnsInstructions(data.dnsInstructions);
          if (data.nameservers) {
            setNameservers(data.nameservers);
          }
          if (data.domain?.dnsChecks?.[0]) {
            const lastCheck = data.domain.dnsChecks[0];
            try {
              setVerification({
                overallValid: lastCheck.overallValid,
                mx: JSON.parse(lastCheck.mxDetails || "{}"),
                spf: JSON.parse(lastCheck.spfDetails || "{}"),
                dkim: JSON.parse(lastCheck.dkimDetails || "{}"),
                dmarc: JSON.parse(lastCheck.dmarcDetails || "{}"),
              });
            } catch {
              // ignore
            }
          }
        }
      });
  }, [selectedDomain]);

  const handleRunVerify = async () => {
    if (!selectedDomain) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/v1/domains/${selectedDomain.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (data.results) {
        setVerification(data.results);
        if (data.isVerified) {
          setSelectedDomain({
            ...selectedDomain,
            isVerified: true,
            status: "VERIFIED",
            isManagedDns: data.results.isDelegatedNs,
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading domain settings...</div>;
  }

  if (domains.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <Radio className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h2 className="text-base font-bold text-slate-800">No Domains Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Please add a domain in the Domains section before configuring DNS.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Radio className="w-6 h-6 text-indigo-600" />
            <span>Domain DNS & Connection Setup</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect your domain to start sending and receiving emails. Choose between automated Nameservers (recommended) or manual DNS records.
          </p>
        </div>

        {/* Domain Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Domain:</label>
          <select
            value={selectedDomain?.id || ""}
            onChange={(e) => {
              const dom = domains.find((d) => d.id === e.target.value);
              if (dom) setSelectedDomain(dom);
            }}
            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.isVerified ? "✓ (Active)" : "(Pending DNS)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {selectedDomain?.isVerified ? (
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                {selectedDomain?.isVerified ? `${selectedDomain.name} is Verified & Active` : "DNS Verification Pending"}
              </h3>
              {selectedDomain?.isVerified && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  Ready for Email
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDomain?.isVerified
                ? "Mail routing, DKIM encryption, SPF anti-spoofing, and DMARC policy are active."
                : "Point your nameservers (Method 1) or add the manual records (Method 2) at your domain registrar, then verify."}
            </p>
          </div>
        </div>

        <button
          onClick={handleRunVerify}
          disabled={checking}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
          <span>{checking ? "Scanning DNS..." : "Verify DNS Now"}</span>
        </button>
      </div>

      {/* Setup Method Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-fit">
        <button
          onClick={() => setActiveSetupTab("nameservers")}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSetupTab === "nameservers"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Method 1: Nameservers (Recommended - 1 Step)</span>
        </button>

        <button
          onClick={() => setActiveSetupTab("manual")}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSetupTab === "manual"
              ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Server className="w-4 h-4 text-slate-500" />
          <span>Method 2: Manual DNS Records</span>
        </button>
      </div>

      {/* METHOD 1: Automated Nameserver Setup */}
      {activeSetupTab === "nameservers" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border border-indigo-100 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-indigo-700 uppercase bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                  Fastest & Easiest
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Connect {selectedDomain?.name} using Nameservers
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Works with GoDaddy, Namecheap, Cloudflare, Hostinger, Squarespace, and all registrars.
              </p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Log in to where you bought your domain (e.g. GoDaddy, Namecheap, etc.), select <strong>Custom Nameservers</strong>, and replace the existing entries with our two nameservers. We will automatically generate and maintain all MX, SPF, DKIM, and DMARC records for you!
            </p>

            {/* Nameservers Display Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NS 1 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Primary Nameserver (Nameserver 1)
                </span>
                <div className="flex items-center justify-between font-mono font-bold text-indigo-700 text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span>{nameservers.ns1}</span>
                  <button
                    onClick={() => copyToClipboard(nameservers.ns1, "ns1")}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Copy Nameserver 1"
                  >
                    {copiedKey === "ns1" ? (
                      <span className="flex items-center text-xs font-sans text-emerald-600 font-bold space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* NS 2 */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Secondary Nameserver (Nameserver 2)
                </span>
                <div className="flex items-center justify-between font-mono font-bold text-indigo-700 text-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span>{nameservers.ns2}</span>
                  <button
                    onClick={() => copyToClipboard(nameservers.ns2, "ns2")}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                    title="Copy Nameserver 2"
                  >
                    {copiedKey === "ns2" ? (
                      <span className="flex items-center text-xs font-sans text-emerald-600 font-bold space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Registrar Instructions Accordion */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRegistrarHelp(!showRegistrarHelp)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span>How to change nameservers at your registrar</span>
                {showRegistrarHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRegistrarHelp && (
                <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-3">
                  <div>
                    <strong className="text-slate-800">GoDaddy:</strong> Go to Domain Portfolio &gt; Select domain &gt; Click <strong>DNS</strong> &gt; Nameservers &gt; <strong>Change Nameservers</strong> &gt; Choose <em>I'll use my own nameservers</em> &gt; Paste NS1 &amp; NS2.
                  </div>
                  <div>
                    <strong className="text-slate-800">Namecheap:</strong> Go to Domain List &gt; Click <strong>Manage</strong> next to your domain &gt; Under <strong>Nameservers</strong> select <em>Custom DNS</em> &gt; Paste NS1 &amp; NS2 &gt; Click the green checkmark to save.
                  </div>
                  <div>
                    <strong className="text-slate-800">Cloudflare:</strong> In your domain DNS overview, update authoritative NS to our addresses.
                  </div>
                  <div>
                    <strong className="text-slate-800">Hostinger / Others:</strong> Open Domains &gt; Manage &gt; DNS / Nameservers &gt; Change Nameservers &gt; Select Custom.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* METHOD 2: Manual DNS Records */}
      {activeSetupTab === "manual" && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>For domains with existing websites:</strong> If you already host your website on Shopify, WordPress, or Webflow and don't want to change nameservers, add these individual records to your current DNS provider.
            </div>
          </div>

          {dnsInstructions && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Required DNS Records for {selectedDomain?.name}</h3>
                <span className="text-xs text-slate-500">Copy &amp; paste into your DNS manager</span>
              </div>

              <div className="divide-y divide-slate-100">
                {Object.entries(dnsInstructions).map(([key, record]) => (
                  <div key={key} className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md font-mono">
                          {record.type}
                        </span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {key.toUpperCase()} RECORD
                        </span>
                      </div>
                      {record.priority !== undefined && (
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                          Priority: {record.priority}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-sans font-semibold text-slate-400 mb-1">HOST / NAME</div>
                        <div className="text-slate-800 font-bold flex items-center justify-between">
                          <span>{record.host}</span>
                          <button
                            onClick={() => copyToClipboard(record.host, `${key}-host`)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Copy"
                          >
                            {copiedKey === `${key}-host` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-sans font-semibold text-slate-400 mb-1">VALUE / CONTENT</div>
                        <div className="text-slate-800 font-bold flex items-center justify-between break-all">
                          <span className="pr-2">{record.value}</span>
                          <button
                            onClick={() => copyToClipboard(record.value, `${key}-value`)}
                            className="text-slate-400 hover:text-slate-600 shrink-0"
                            title="Copy"
                          >
                            {copiedKey === `${key}-value` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diagnostics Comparison (Expected vs Detected) */}
      {verification && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Live DNS Query Results</span>
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                verification.overallValid ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-amber-950 text-amber-300 border border-amber-800"
              }`}
            >
              {verification.overallValid ? "ALL CHECKS PASSED ✓" : "RECORDS INCOMPLETE ⚠️"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NS */}
            {verification.ns && (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Nameservers Delegation</span>
                  {verification.ns.valid ? (
                    <span className="text-xs text-emerald-400 flex items-center space-x-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Delegated to Platform Nameservers</span>
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Using External Nameservers</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono">Expected: {verification.ns.expected}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  Detected: {verification.ns.detected?.length > 0 ? verification.ns.detected.join(", ") : "None"}
                </p>
                {verification.ns.message && <p className="text-[10px] text-slate-400">{verification.ns.message}</p>}
              </div>
            )}

            {/* MX */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">MX Record</span>
                {verification.mx.valid ? (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configured</span>
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Not detected</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Expected: {verification.mx.expected}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Detected: {verification.mx.detected.length > 0 ? verification.mx.detected.join(", ") : "None"}
              </p>
              {verification.mx.message && <p className="text-[10px] text-rose-300">{verification.mx.message}</p>}
            </div>

            {/* SPF */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">SPF (TXT @)</span>
                {verification.spf.valid ? (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configured</span>
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Not detected</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Expected: {verification.spf.expected}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Detected: {verification.spf.detected.length > 0 ? verification.spf.detected.join(", ") : "None"}
              </p>
              {verification.spf.message && <p className="text-[10px] text-rose-300">{verification.spf.message}</p>}
            </div>

            {/* DKIM */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">DKIM Record</span>
                {verification.dkim.valid ? (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configured</span>
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Not detected</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">Expected: {verification.dkim.expected}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Detected: {verification.dkim.detected.length > 0 ? verification.dkim.detected.join(", ") : "None"}
              </p>
              {verification.dkim.message && <p className="text-[10px] text-rose-300">{verification.dkim.message}</p>}
            </div>

            {/* DMARC */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">DMARC Record</span>
                {verification.dmarc.valid ? (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Configured</span>
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Not detected</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Expected: {verification.dmarc.expected}</p>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Detected: {verification.dmarc.detected.length > 0 ? verification.dmarc.detected.join(", ") : "None"}
              </p>
              {verification.dmarc.message && <p className="text-[10px] text-rose-300">{verification.dmarc.message}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DnsSetupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading DNS records...</div>}>
      <DnsSetupContent />
    </Suspense>
  );
}
