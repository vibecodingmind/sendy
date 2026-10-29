"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Zap,
  Phone,
  X,
  Loader2,
  Smartphone,
} from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthlyCents: number;
  maxDomains: number;
  maxMailboxes: number;
  maxStorageGb: number;
  maxAliases: number;
  maxForwarders: number;
}

interface SubscriptionData {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: PlanItem;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

const MOBILE_PROVIDERS = [
  { value: "Mpesa", label: "M-Pesa (Vodacom)", color: "bg-red-500" },
  { value: "Airtel", label: "Airtel Money", color: "bg-rose-600" },
  { value: "Tigo", label: "Tigo Pesa", color: "bg-blue-600" },
  { value: "Halopesa", label: "Halopesa", color: "bg-orange-500" },
  { value: "Azampesa", label: "AzamPesa", color: "bg-sky-600" },
];

export default function BillingPage() {
  const [subData, setSubData] = useState<{
    subscription: SubscriptionData | null;
    availablePlans: PlanItem[];
    usage: { domains: number; mailboxes: number; usedStorageGb: number };
  } | null>(null);

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AzamPay payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    plan: PlanItem | null;
  }>({ open: false, plan: null });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobileProvider, setMobileProvider] = useState("Mpesa");
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "pending" | "success" | "failed"
  >("idle");

  const fetchData = async () => {
    try {
      const [subRes, invRes] = await Promise.all([
        fetch("/api/v1/billing/subscription"),
        fetch("/api/v1/billing/invoices"),
      ]);

      if (subRes.ok && invRes.ok) {
        const sData = await subRes.json();
        const iData = await invRes.json();
        setSubData(sData);
        setInvoices(iData.invoices || []);
      }
    } catch {
      setError("Failed to load billing information.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPaymentModal = (plan: PlanItem) => {
    setPaymentModal({ open: true, plan });
    setPaymentStatus("idle");
    setError(null);
    setMessage(null);
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, plan: null });
    setPhoneNumber("");
    setMobileProvider("Mpesa");
    setPaymentStatus("idle");
  };

  const handleAzamPayCheckout = async () => {
    if (!paymentModal.plan) return;

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setError("Please enter a valid phone number.");
      return;
    }

    setPaymentStatus("processing");
    setError(null);

    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: paymentModal.plan.id,
          phoneNumber: cleanPhone,
          mobileProvider,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to initiate payment.");
        setPaymentStatus("failed");
      } else {
        // For mock provider: direct redirect
        if (data.checkoutUrl && !data.checkoutUrl.includes("provider=azampay")) {
          if (data.checkoutUrl.startsWith("http")) {
            window.location.href = data.checkoutUrl;
            return;
          }
          // Mock: instant success
          setMessage(data.message || "Plan updated successfully!");
          closePaymentModal();
          fetchData();
          return;
        }

        // AzamPay: show pending state, wait for USSD confirmation
        setPaymentStatus("pending");

        // Poll for payment confirmation (check subscription status)
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts++;
          try {
            const subRes = await fetch("/api/v1/billing/subscription");
            if (subRes.ok) {
              const subCheck = await subRes.json();
              if (
                subCheck.subscription?.plan?.id === paymentModal.plan?.id &&
                subCheck.subscription?.status === "ACTIVE"
              ) {
                clearInterval(pollInterval);
                setPaymentStatus("success");
                setMessage(`Plan upgraded to ${paymentModal.plan?.name} successfully!`);
                setTimeout(() => {
                  closePaymentModal();
                  fetchData();
                }, 2000);
                return;
              }
            }
          } catch {
            // Ignore polling errors
          }

          // Stop polling after 2 minutes
          if (attempts >= 24) {
            clearInterval(pollInterval);
            setPaymentStatus("idle");
            setMessage("Payment is still being processed. Please check back shortly.");
            closePaymentModal();
          }
        }, 5000);
      }
    } catch {
      setError("Network error. Please try again.");
      setPaymentStatus("failed");
    }
  };

  const handleUpgradePlan = async (plan: PlanItem) => {
    // Check if AzamPay is the provider — show the modal
    // Otherwise fall back to old behavior (redirect-based)
    openPaymentModal(plan);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-400">Loading billing information...</div>;
  }

  const currentPlan = subData?.subscription?.plan;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing & Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your email hosting plan, review invoices, and expand mailbox or storage capacity.
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && !paymentModal.open && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Plan</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {subData?.subscription?.status || "ACTIVE"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mt-1">{currentPlan?.name || "Free Trial"}</h2>
          <p className="text-xs text-slate-500 mt-1">
            Renews on{" "}
            <span className="font-semibold text-slate-700">
              {subData?.subscription?.currentPeriodEnd
                ? new Date(subData.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 text-xs">
          <div>
            <span className="text-slate-400 font-medium">Domains</span>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {subData?.usage.domains} / {currentPlan?.maxDomains}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Mailboxes</span>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {subData?.usage.mailboxes} / {currentPlan?.maxMailboxes}
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Storage</span>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {subData?.usage.usedStorageGb} GB / {currentPlan?.maxStorageGb} GB
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans Selector */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subData?.availablePlans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id;
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-6 border flex flex-col justify-between shadow-xs transition-all ${
                  isCurrent ? "border-indigo-600 ring-2 ring-indigo-600/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="mt-4 flex items-baseline space-x-1">
                    <span className="text-3xl font-extrabold text-slate-900">
                      ${(plan.priceMonthlyCents / 100).toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ month</span>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{plan.maxDomains} Custom Domains</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{plan.maxMailboxes} User Mailboxes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{plan.maxStorageGb} GB Total Storage</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{plan.maxAliases} Email Aliases</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{plan.maxForwarders} Forwarders</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgradePlan(plan)}
                  disabled={isCurrent}
                  className={`mt-6 w-full py-2 px-4 rounded-lg text-xs font-semibold transition-colors shadow-xs ${
                    isCurrent
                      ? "bg-slate-100 text-slate-400 cursor-default"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {isCurrent ? "Current Plan" : "Select Plan"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Billing Invoices</h3>
          </div>
          <span className="text-xs text-slate-400">{invoices.length} invoices</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono font-semibold text-slate-800">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-3 font-bold text-slate-800">
                      ${(inv.amountCents / 100).toFixed(2)} {inv.currency}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── AzamPay Payment Modal ── */}
      {paymentModal.open && paymentModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Mobile Money Payment</h3>
              </div>
              <button
                onClick={closePaymentModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Plan summary */}
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Upgrading to</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{paymentModal.plan.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-900">
                      ${(paymentModal.plan.priceMonthlyCents / 100).toFixed(0)}
                    </p>
                    <p className="text-[11px] text-slate-500">per month</p>
                  </div>
                </div>
              </div>

              {paymentStatus === "pending" ? (
                /* Pending USSD confirmation */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Check Your Phone</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      A payment prompt has been sent to <span className="font-semibold text-slate-700">{phoneNumber}</span>.
                      <br />Please enter your PIN to confirm.
                    </p>
                  </div>
                  <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    <span>Waiting for confirmation…</span>
                  </div>
                </div>
              ) : paymentStatus === "success" ? (
                /* Success state */
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Payment Successful!</h4>
                  <p className="text-sm text-slate-500">Your plan has been upgraded.</p>
                </div>
              ) : (
                /* Payment form */
                <>
                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Phone number input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 py-2.5 text-xs font-semibold bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-600">
                        +255
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="7XX XXX XXX"
                        className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Mobile provider selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Mobile Money Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {MOBILE_PROVIDERS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setMobileProvider(p.value)}
                          className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                            mobileProvider === p.value
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/20"
                              : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pay button */}
                  <button
                    onClick={handleAzamPayCheckout}
                    disabled={paymentStatus === "processing"}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-2"
                  >
                    {paymentStatus === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Initiating Payment…</span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4" />
                        <span>Pay via Mobile Money</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center">
                    A USSD prompt will be sent to your phone. Confirm with your PIN to complete the payment.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
