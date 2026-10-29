"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Building2, AlertTriangle, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    organizationName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
      } else {
        router.push("/onboarding");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 auth-grid text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-brand-500 selection:text-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] auth-glow pointer-events-none" />
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link href="/login" className="inline-flex items-center space-x-2.5 group mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Mail className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-indigo-400 transition-colors">
            Monogram<span className="text-indigo-400">Mail</span>
          </span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Create your account
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Start your 14-day free trial. Zero setup fees, no credit card required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-[#0B0F19]/80 backdrop-blur-xl py-8 px-6 sm:px-8 rounded-2xl border border-white/[0.08] shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center space-x-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Company / Organization Name
              </label>
              <input
                type="text"
                required
                placeholder="Apex Technologies LLC"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="Sarah"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Connor"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                placeholder="sarah@apextech.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Master Password (Min 8 Characters)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Creating Organization...</span>
              ) : (
                <>
                  <span>Create Workspace &amp; Start Trial</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-400">
            Already have an organization?{" "}
            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              Sign In
            </Link>
          </div>
        </div>

        {/* Features preview footer */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-4">
          <span>✓ Instant DNS Wizard</span>
          <span>✓ 2048-bit DKIM</span>
          <span>✓ 100% Data Sovereignty</span>
        </div>
      </div>
    </div>
  );
}
