"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, AlertTriangle, ArrowRight, ShieldCheck, Shield, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please verify credentials.");
      } else if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      } else {
        if (data.user?.role === "SUPER_ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-ink-950 auth-grid text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-brand-500 selection:text-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] auth-glow pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-96 h-96 bg-indigo-500/10 blur-[130px] rounded-full pointer-events-none" />

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
          Welcome back
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Sign in to access your mailbox control plane or administration console.
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

          {requiresTwoFactor ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Two-Factor Authentication Required</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Enter the 6-digit code from your authenticator app (or an 8-character recovery backup code).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Authentication Code
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="123456 or a1b2c3d4"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-wider"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <span>Verify &amp; Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode("");
                  setError(null);
                }}
                className="w-full py-1 text-center text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                &larr; Back to standard login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-black/40 border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Platform</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick-fill Seed Credentials — development only */}
          {!requiresTwoFactor && process.env.NODE_ENV !== "production" && (
            <div className="pt-5 border-t border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                1-Click Demo Logins
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">Pre-seeded</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("owner@democorp.com", "DemoPass123!")}
                className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-indigo-500/40 rounded-xl text-left transition-all group"
              >
                <span className="text-[11px] font-semibold text-slate-200 block group-hover:text-indigo-300 transition-colors">
                  Customer Admin
                </span>
                <span className="text-[10px] text-slate-500 block font-mono truncate">
                  owner@democorp.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("admin@monogrammail.com", "AdminPass123!")}
                className="p-2.5 bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border border-amber-500/20 hover:border-amber-500/40 rounded-xl text-left transition-all group"
              >
                <span className="text-[11px] font-semibold text-amber-300 block group-hover:text-amber-200 transition-colors">
                  Super Admin
                </span>
                <span className="text-[10px] text-amber-500/70 block font-mono truncate">
                  admin@monogrammail.com
                </span>
              </button>
            </div>
          </div>
          )}

          <div className="pt-2 text-center text-xs text-slate-400">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
              Create Organization
            </Link>
          </div>
        </div>

        {/* Security assurance tag */}
        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected with TLS 1.3 &amp; SSHA-512 cryptographic storage</span>
        </div>
      </div>
    </div>
  );
}
