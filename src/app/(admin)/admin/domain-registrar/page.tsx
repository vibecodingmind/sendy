"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Zap,
  Radio,
  Sliders,
  Sparkles,
} from "lucide-react";

export default function AdminDomainRegistrarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    accountBalance?: string;
  } | null>(null);

  // Form state
  const [activeProvider, setActiveProvider] = useState("mock");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [apiUser, setApiUser] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [nameserver1, setNameserver1] = useState("ns1.monogrammail.com");
  const [nameserver2, setNameserver2] = useState("ns2.monogrammail.com");
  const [markupPercent, setMarkupPercent] = useState(20);
  const [currency, setCurrency] = useState("USD");

  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/domain-registrar");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          const s = data.settings;
          setActiveProvider(s.activeProvider || "mock");
          setEnvironment(s.environment || "sandbox");
          setApiUser(s.apiUser || "");
          setApiKey(s.apiKey || "");
          setApiSecret(s.apiSecret || "");
          setBaseUrl(s.baseUrl || "");
          setNameserver1(s.nameserver1 || "ns1.monogrammail.com");
          setNameserver2(s.nameserver2 || "ns2.monogrammail.com");
          setMarkupPercent(s.markupPercent ?? 20);
          setCurrency(s.currency || "USD");
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/admin/domain-registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeProvider,
          environment,
          apiUser,
          apiKey,
          apiSecret,
          baseUrl,
          nameserver1,
          nameserver2,
          markupPercent,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
      fetchSettings();
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving registrar settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/admin/domain-registrar/test", {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({
        success: false,
        message: "Failed to connect to registrar test endpoint.",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading registrar configuration...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Globe className="w-6 h-6 text-amber-400" />
          <span>Domain Registrar & DNS Automation</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure external domain registrar APIs to enable instant domain searches, purchases, transfers, and automated nameserver routing for customers.
        </p>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Domain Registrar settings saved successfully. Changes take effect immediately.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-950/70 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Provider Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { id: "mock", name: "Mock Simulator", desc: "Local simulation for zero-cost testing" },
          { id: "custom", name: "Custom REST API", desc: "Universal API driver with custom endpoints" },
          { id: "namecheap", name: "Namecheap API", desc: "Direct integration via Namecheap XML API" },
          { id: "resellerclub", name: "ResellerClub / LogicBoxes", desc: "High-volume domain provisioning" },
        ].map((p) => {
          const isSelected = activeProvider === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setActiveProvider(p.id)}
              className={`cursor-pointer p-4 rounded-xl border transition-all ${
                isSelected
                  ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{p.name}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[11px] text-slate-400">{p.desc}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Credentials Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-amber-400">
              <Key className="w-4 h-4" />
              <h3 className="text-sm font-bold text-white">Registrar API Credentials</h3>
            </div>

            {/* Environment Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Environment:</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setEnvironment("sandbox")}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    environment === "sandbox" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sandbox (Test)
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironment("production")}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    environment === "production" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Production (Live)
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">API Username / Account ID</label>
              <input
                type="text"
                value={apiUser}
                onChange={(e) => setApiUser(e.target.value)}
                placeholder="e.g. reseller_account_01"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">API Base Endpoint / URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g. https://api.sandbox.registrar.com/v1"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">API Key / Token</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter registrar API key"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">API Secret Key (If required)</label>
              <div className="relative">
                <input
                  type={showApiSecret ? "text" : "password"}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter registrar API secret"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 pr-9 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showApiSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin text-amber-400" : ""}`} />
              <span>{testing ? "Testing Gateway..." : "Test Connection"}</span>
            </button>

            {testResult && (
              <div
                className={`text-xs px-3 py-1.5 rounded-lg border flex items-center space-x-2 ${
                  testResult.success
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/60 border-rose-800 text-rose-300"
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{testResult.message}</span>
                {testResult.accountBalance && (
                  <span className="font-bold font-mono pl-1 border-l border-emerald-700">
                    Balance: {testResult.accountBalance}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Default Nameservers & Automated DNS Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 pb-3 border-b border-slate-800">
            <Server className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Default Nameservers (cPanel Automated Mode)</h3>
          </div>
          <p className="text-xs text-slate-400">
            When customers purchase or transfer domains through your platform, these nameservers are automatically assigned via the registrar API so email works immediately with zero manual DNS setup.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Primary Nameserver (NS1)</label>
              <input
                type="text"
                required
                value={nameserver1}
                onChange={(e) => setNameserver1(e.target.value)}
                placeholder="ns1.monogrammail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Secondary Nameserver (NS2)</label>
              <input
                type="text"
                required
                value={nameserver2}
                onChange={(e) => setNameserver2(e.target.value)}
                placeholder="ns2.monogrammail.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Pricing & Markup Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Domain Store Pricing & Profit Markup</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Retail Markup Percentage</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">% markup on wholesale domain cost</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Billing Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
              >
                <option value="USD">USD ($)</option>
                <option value="TZS">TZS (Tsh)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center space-x-2 shadow-lg shadow-amber-500/10"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <span>Save Registrar Configuration</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
