"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, RefreshCw, Mail, ArrowRight } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No verification token was provided in the link.");
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setSuccess(true);
          setVerifiedEmail(data.user?.email || null);
        } else {
          setError(data.error || "Verification failed. The token may be expired or invalid.");
        }
      } catch {
        setError("Network error occurred while verifying email. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        {/* Brand / Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Mail className="w-7 h-7" />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Verifying Email Address...</h2>
            <p className="text-xs text-slate-400">
              Please wait while we confirm and authenticate your credentials.
            </p>
          </div>
        )}

        {/* Success State */}
        {!loading && success && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Email Successfully Verified!</h2>
              <p className="text-xs text-slate-400">
                Your email address{" "}
                {verifiedEmail && <span className="font-semibold text-slate-200">{verifiedEmail}</span>}{" "}
                has been authenticated. You now have full access to your account and services.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Sign In With Another Account
              </Link>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Verification Link Expired or Invalid</h2>
              <p className="text-xs text-slate-400">{error}</p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Return to Login</span>
              </Link>
              <Link
                href="/settings"
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
              >
                Go to Account Settings to Request a New Link
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          Loading verification...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
