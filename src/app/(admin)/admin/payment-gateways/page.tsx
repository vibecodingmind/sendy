"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Save,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Zap,
} from "lucide-react";

interface PaymentSettingsState {
  activeProvider: string;
  azampay: {
    appName: string;
    clientId: string;
    clientSecret: string;
    hasClientSecret: boolean;
    apiKey: string;
    hasApiKey: boolean;
    environment: "sandbox" | "production";
    baseUrl: string;
    authUrl: string;
    callbackUrl: string;
    usdToTzsRate: number;
    simulate: boolean;
  };
  stripe: {
    publishableKey: string;
    secretKey: string;
    hasSecretKey: boolean;
    webhookSecret: string;
    hasWebhookSecret: boolean;
    currency: string;
  };
}

export default function AdminPaymentGatewaysPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [settings, setSettings] = useState<PaymentSettingsState>({
    activeProvider: "azampay",
    azampay: {
      appName: "UltimateSMS",
      clientId: "59c7aa73-3b99-49ef-b1fd-be1a112ad7f6",
      clientSecret: "",
      hasClientSecret: false,
      apiKey: "358d7e29-2055-4bf3-b991-32a3ad8b287b",
      hasApiKey: false,
      environment: "sandbox",
      baseUrl: "https://sandbox.azampay.co.tz",
      authUrl: "https://authenticator-sandbox.azampay.co.tz",
      callbackUrl: "/api/v1/billing/webhook/azampay",
      usdToTzsRate: 2700,
      simulate: false,
    },
    stripe: {
      publishableKey: "",
      secretKey: "",
      hasSecretKey: false,
      webhookSecret: "",
      hasWebhookSecret: false,
      currency: "USD",
    },
  });

  // Secret visibility
  const [showAzamSecret, setShowAzamSecret] = useState(false);
  const [showAzamApiKey, setShowAzamApiKey] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [copiedAzamWebhook, setCopiedAzamWebhook] = useState(false);
  const [copiedStripeWebhook, setCopiedStripeWebhook] = useState(false);

  // Test Connection States
  const [testingAzam, setTestingAzam] = useState(false);
  const [azamTestResult, setAzamTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    fetch("/api/v1/admin/payment-gateways")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/v1/admin/payment-gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", text: "Payment gateway settings saved successfully!" });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        const errData = await res.json();
        setStatusMessage({ type: "error", text: errData.error || "Failed to save settings." });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error while saving settings." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAzamPay = async () => {
    setTestingAzam(true);
    setAzamTestResult(null);

    try {
      const res = await fetch("/api/v1/admin/payment-gateways/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "azampay",
          azampay: settings.azampay,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAzamTestResult({ success: true, message: data.message });
      } else {
        setAzamTestResult({ success: false, message: data.error || data.message || "AzamPay authentication test failed." });
      }
    } catch (err: any) {
      setAzamTestResult({ success: false, message: `Test failed: ${err.message}` });
    } finally {
      setTestingAzam(false);
    }
  };

  const handleTestStripe = async () => {
    setTestingStripe(true);
    setStripeTestResult(null);

    try {
      const res = await fetch("/api/v1/admin/payment-gateways/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "stripe",
          stripe: settings.stripe,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStripeTestResult({ success: true, message: data.message });
      } else {
        setStripeTestResult({ success: false, message: data.error || "Stripe test failed." });
      }
    } catch (err: any) {
      setStripeTestResult({ success: false, message: `Test failed: ${err.message}` });
    } finally {
      setTestingStripe(false);
    }
  };

  const handleEnvChange = (env: "sandbox" | "production") => {
    const isSandbox = env === "sandbox";
    setSettings({
      ...settings,
      azampay: {
        ...settings.azampay,
        environment: env,
        baseUrl: isSandbox ? "https://sandbox.azampay.co.tz" : "https://api.azampay.co.tz",
        authUrl: isSandbox ? "https://authenticator-sandbox.azampay.co.tz" : "https://authenticator.azampay.co.tz",
      },
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading payment gateway settings...</div>;
  }

  const azamWebhookUrl = `${origin || "https://mail.yourdomain.com"}/api/v1/billing/webhook/azampay`;
  const stripeWebhookUrl = `${origin || "https://mail.yourdomain.com"}/api/v1/billing/webhook`;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <CreditCard className="w-6 h-6 text-amber-400" />
          <span>Payment Gateways &amp; Billing Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure AzamPay mobile money (M-Pesa, Airtel Money, Tigo Pesa, Halopesa, AzamPesa), Stripe credit cards, or test sandbox mode.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
            statusMessage.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : "bg-rose-950/80 border-rose-800 text-rose-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Active Gateway Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Active Billing Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Select the primary gateway used during customer checkout and plan upgrades.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* AzamPay Card */}
            <div
              onClick={() => setSettings({ ...settings, activeProvider: "azampay" })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                settings.activeProvider === "azampay"
                  ? "bg-amber-500/10 border-amber-500 text-white ring-2 ring-amber-500/20"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">AzamPay</span>
                </div>
                {settings.activeProvider === "azampay" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                M-Pesa, Airtel Money, Tigo Pesa, Halopesa &amp; AzamPesa USSD mobile push checkout across East Africa.
              </p>
            </div>

            {/* Stripe Card */}
            <div
              onClick={() => setSettings({ ...settings, activeProvider: "stripe" })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                settings.activeProvider === "stripe"
                  ? "bg-indigo-500/10 border-indigo-500 text-white ring-2 ring-indigo-500/20"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm text-white">Stripe</span>
                </div>
                {settings.activeProvider === "stripe" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                International credit &amp; debit cards (Visa, MasterCard, Amex) and SEPA direct debit.
              </p>
            </div>

            {/* Mock Card */}
            <div
              onClick={() => setSettings({ ...settings, activeProvider: "mock" })}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                settings.activeProvider === "mock"
                  ? "bg-slate-800 border-slate-600 text-white ring-2 ring-slate-600/30"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="font-bold text-sm text-white">Test / Simulation</span>
                </div>
                {settings.activeProvider === "mock" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-white font-bold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instant automatic subscription activation for staging, testing, and team demonstration.
              </p>
            </div>
          </div>
        </div>

        {/* ── AzamPay Gateway Details ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>AzamPay Gateway Credentials &amp; Parameters</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Docs: <a href="https://developerdocs.azampay.co.tz" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">developerdocs.azampay.co.tz</a>
              </p>
            </div>

            {/* Environment Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handleEnvChange("sandbox")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  settings.azampay.environment === "sandbox"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sandbox (Test)
              </button>
              <button
                type="button"
                onClick={() => handleEnvChange("production")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  settings.azampay.environment === "production"
                    ? "bg-emerald-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Production (Live)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* App Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                App Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UltimateSMS"
                value={settings.azampay.appName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azampay: { ...settings.azampay, appName: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Client ID <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 59c7aa73-3b99-49ef-b1fd-be1a112ad7f6"
                value={settings.azampay.clientId}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azampay: { ...settings.azampay, clientId: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            {/* Client Secret Key */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">
                  Client Secret Key <span className="text-amber-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAzamSecret(!showAzamSecret)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                >
                  {showAzamSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAzamSecret ? "Mask Key" : "Reveal Key"}</span>
                </button>
              </div>
              <textarea
                rows={showAzamSecret ? 3 : 2}
                placeholder="Paste the AzamPay Client Secret Key here..."
                value={settings.azampay.clientSecret}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azampay: { ...settings.azampay, clientSecret: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-[11px] leading-relaxed break-all"
              />
            </div>

            {/* API Token */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">
                  API Key / Token (Bearer Token / Secret)
                </label>
                <button
                  type="button"
                  onClick={() => setShowAzamApiKey(!showAzamApiKey)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                >
                  {showAzamApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAzamApiKey ? "Mask" : "Reveal"}</span>
                </button>
              </div>
              <input
                type={showAzamApiKey ? "text" : "password"}
                placeholder="e.g. 358d7e29-2055-4bf3-b991-32a3ad8b287b"
                value={settings.azampay.apiKey}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azampay: { ...settings.azampay, apiKey: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            {/* Endpoints & Rate */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                MNO Checkout Base URL
              </label>
              <input
                type="text"
                value={settings.azampay.baseUrl}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azampay: { ...settings.azampay, baseUrl: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                OAuth Authentication URL
              </label>
              <input
                type="text"
                value={settings.azampay.authUrl}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    azampay: { ...settings.azampay, authUrl: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                USD to TZS Exchange Rate
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="10"
                  value={settings.azampay.usdToTzsRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      azampay: { ...settings.azampay, usdToTzsRate: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold"
                />
                <span className="text-slate-400 font-mono text-xs whitespace-nowrap">
                  1 USD = {settings.azampay.usdToTzsRate.toLocaleString()} TZS
                </span>
              </div>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.azampay.simulate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      azampay: { ...settings.azampay, simulate: e.target.checked },
                    })
                  }
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-slate-300 font-medium">
                  Enable Simulated Checkout (Auto-approve test numbers)
                </span>
              </label>
            </div>
          </div>

          {/* Webhook Callback Display */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">AzamPay Webhook Callback URL:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(azamWebhookUrl);
                  setCopiedAzamWebhook(true);
                  setTimeout(() => setCopiedAzamWebhook(false), 2000);
                }}
                className="text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                {copiedAzamWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAzamWebhook ? "Copied!" : "Copy Webhook URL"}</span>
              </button>
            </div>
            <p className="font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-all select-all">
              {azamWebhookUrl}
            </p>
            <p className="text-[11px] text-slate-500">
              Provide this URL in your AzamPay portal under Webhooks / Callback notifications.
            </p>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              disabled={testingAzam}
              onClick={handleTestAzamPay}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingAzam ? "animate-spin" : ""}`} />
              <span>{testingAzam ? "Testing AzamPay..." : "Test AzamPay Connection"}</span>
            </button>

            {azamTestResult && (
              <div
                className={`text-xs px-3 py-1.5 rounded-lg border flex items-center space-x-2 ${
                  azamTestResult.success
                    ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                    : "bg-rose-950 border-rose-800 text-rose-300"
                }`}
              >
                {azamTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{azamTestResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Stripe Gateway Details ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-indigo-400" />
                <span>Stripe International Credit Cards</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure Stripe API keys for global credit/debit card processing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Stripe Publishable Key (pk_...)
              </label>
              <input
                type="text"
                placeholder="pk_live_... or pk_test_..."
                value={settings.stripe.publishableKey}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe: { ...settings.stripe, publishableKey: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Default Currency
              </label>
              <select
                value={settings.stripe.currency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe: { ...settings.stripe, currency: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="TZS">TZS - Tanzanian Shilling (TSh)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-semibold">
                  Stripe Secret Key (sk_...)
                </label>
                <button
                  type="button"
                  onClick={() => setShowStripeSecret(!showStripeSecret)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  {showStripeSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showStripeSecret ? "Mask" : "Reveal"}</span>
                </button>
              </div>
              <input
                type={showStripeSecret ? "text" : "password"}
                placeholder="sk_live_... or sk_test_..."
                value={settings.stripe.secretKey}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe: { ...settings.stripe, secretKey: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">
                Stripe Webhook Signing Secret (whsec_...)
              </label>
              <input
                type="password"
                placeholder="whsec_..."
                value={settings.stripe.webhookSecret}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    stripe: { ...settings.stripe, webhookSecret: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Stripe Webhook Endpoint:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(stripeWebhookUrl);
                  setCopiedStripeWebhook(true);
                  setTimeout(() => setCopiedStripeWebhook(false), 2000);
                }}
                className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                {copiedStripeWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStripeWebhook ? "Copied!" : "Copy Webhook URL"}</span>
              </button>
            </div>
            <p className="font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-all select-all">
              {stripeWebhookUrl}
            </p>
          </div>

          {/* Test Stripe Connection */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              disabled={testingStripe}
              onClick={handleTestStripe}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingStripe ? "animate-spin" : ""}`} />
              <span>{testingStripe ? "Testing Stripe..." : "Test Stripe Connection"}</span>
            </button>

            {stripeTestResult && (
              <div
                className={`text-xs px-3 py-1.5 rounded-lg border flex items-center space-x-2 ${
                  stripeTestResult.success
                    ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                    : "bg-rose-950 border-rose-800 text-rose-300"
                }`}
              >
                {stripeTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{stripeTestResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Payment Gateway Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
