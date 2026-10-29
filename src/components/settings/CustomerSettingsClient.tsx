"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Server,
  Smartphone,
  Laptop,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  LogOut,
  Lock,
  X,
  ShieldCheck,
} from "lucide-react";
import { AppSettings } from "@/lib/config";
import { PageHeader } from "@/components/ui/PageHeader";

interface CustomerSettingsClientProps {
  mailSettings: AppSettings;
}

export function CustomerSettingsClient({ mailSettings }: CustomerSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "email-client" | "security">("profile");

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading2fa, setLoading2fa] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpVerifyCode, setTotpVerifyCode] = useState("");
  const [enabling2fa, setEnabling2fa] = useState(false);
  const [disabling2fa, setDisabling2fa] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  // Active Sessions State
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      ipAddress: string;
      userAgent: string;
      lastActiveAt: string;
      createdAt: string;
      isCurrent: boolean;
    }>
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);

  // User profile state
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedDate, setVerifiedDate] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status feedback
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verification link state
  const [resendingVerification, setResendingVerification] = useState(false);
  const [generatedVerificationUrl, setGeneratedVerificationUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch current user details
  const fetchUserProfile = async () => {
    setLoadingUser(true);
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserId(data.user.id);
          setFirstName(data.user.firstName || "");
          setLastName(data.user.lastName || "");
          setEmail(data.user.email || "");
          setRole(data.user.role || "");
          setIsEmailVerified(Boolean(data.user.emailVerified));
          setVerifiedDate(data.user.emailVerified ? new Date(data.user.emailVerified).toLocaleDateString() : null);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingUser(false);
    }
  };

  const fetch2faStatus = async () => {
    setLoading2fa(true);
    try {
      const res = await fetch("/api/v1/auth/2fa");
      if (res.ok) {
        const data = await res.json();
        setTwoFactorEnabled(Boolean(data.enabled));
        if (!data.enabled) {
          setTwoFactorSecret(data.secret || "");
          setOtpauthUri(data.otpauthUri || "");
          setBackupCodes(data.backupCodes || []);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading2fa(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch("/api/v1/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetch2faStatus();
    fetchSessions();
  }, []);

  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setEnabling2fa(true);
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: twoFactorSecret,
          code: totpVerifyCode,
          backupCodes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enable two-factor authentication.");
      }
      setTwoFactorEnabled(true);
      setShowEnableModal(false);
      setTotpVerifyCode("");
      setSuccessMsg("Two-Factor Authentication (TOTP) has been enabled on your account!");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEnabling2fa(false);
    }
  };

  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setDisabling2fa(true);
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to disable two-factor authentication.");
      }
      setTwoFactorEnabled(false);
      setShowDisableModal(false);
      setDisablePassword("");
      setSuccessMsg("Two-Factor Authentication has been disabled.");
      fetch2faStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setDisabling2fa(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!confirm("Are you sure you want to sign out of all other devices?")) return;
    setRevokingSessions(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/sessions", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("All other devices have been logged out.");
        fetchSessions();
      } else {
        setErrorMsg(data.error || "Failed to revoke sessions.");
      }
    } catch {
      setErrorMsg("Network error revoking sessions.");
    } finally {
      setRevokingSessions(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword && newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match.");
      return;
    }

    if (newPassword && !currentPassword) {
      setErrorMsg("Please enter your current password to set a new password.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        firstName,
        lastName,
        email,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/v1/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setSuccessMsg("Account profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (data.emailChanged) {
        setIsEmailVerified(false);
        if (data.verificationUrl) {
          setGeneratedVerificationUrl(data.verificationUrl);
        }
      }

      // Refresh data
      fetchUserProfile();
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestVerificationLink = async () => {
    setResendingVerification(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.verificationUrl) {
        setGeneratedVerificationUrl(data.verificationUrl);
        setSuccessMsg("A new verification link has been generated!");
      } else {
        setErrorMsg(data.error || data.message || "Failed to generate verification link.");
      }
    } catch {
      setErrorMsg("Network error generating verification link.");
    } finally {
      setResendingVerification(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedVerificationUrl) return;
    navigator.clipboard.writeText(generatedVerificationUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase() || email.charAt(0).toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Profile, security, two-factor authentication, and email client setup."
        actions={
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "profile"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Account</span>
          </button>

          <button
            onClick={() => setActiveTab("email-client")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "email-client"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Email Client Setup</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === "security"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security &amp; 2FA</span>
          </button>
        </div>
        }
      />

      {/* TAB 1: Profile & Account */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* User Overview Header Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-indigo-100">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : email}
                </h2>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono">{email}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">
                    {role}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Status Badge */}
            <div>
              {isEmailVerified ? (
                <div className="inline-flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Email Verified {verifiedDate ? `(${verifiedDate})` : ""}</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Email Unverified</span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Personal Details */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Personal Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Email Address & Verification Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Account Email Address</label>
                  <span className="text-[11px] text-slate-500">Changing this will update your login credentials</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Email Verification Box */}
                {!isEmailVerified && (
                  <div className="mt-3 p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-amber-900">Your email address is not verified yet</div>
                        <div className="text-[11px] text-amber-700">
                          Verify your email to ensure uninterrupted delivery of password resets and system alerts.
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRequestVerificationLink}
                        disabled={resendingVerification}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${resendingVerification ? "animate-spin" : ""}`} />
                        <span>{resendingVerification ? "Generating..." : "Get Verification Link"}</span>
                      </button>
                    </div>

                    {generatedVerificationUrl && (
                      <div className="pt-2 border-t border-amber-200/80 flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedVerificationUrl}
                          className="bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-mono flex-1 select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                        >
                          {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{linkCopied ? "Copied" : "Copy"}</span>
                        </button>
                        <a
                          href={generatedVerificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Change Password Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>Security & Password</span>
              </h3>
              <p className="text-xs text-slate-500">
                Leave these fields empty if you do not want to change your current password.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-9 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-9 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Profile & Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Email Client Setup */}
      {activeTab === "email-client" && (
        <div className="space-y-8">
          {/* Protocol Parameter Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IMAP Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Server className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Incoming Mail (IMAP)</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Server Hostname</span>
                  <span className="font-mono font-bold text-slate-800">{mailSettings.mailImapHost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Port</span>
                  <span className="font-mono font-bold text-slate-800">{mailSettings.mailImapPort}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Encryption / Security</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    SSL / TLS
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Username</span>
                  <span className="font-mono text-slate-700">Your full email (e.g. john@yourdomain.com)</span>
                </div>
              </div>
            </div>

            {/* SMTP Card */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 text-blue-600">
                <Server className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Outgoing Mail (SMTP)</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Server Hostname</span>
                  <span className="font-mono font-bold text-slate-800">{mailSettings.mailSmtpHost}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Port</span>
                  <span className="font-mono font-bold text-slate-800">{mailSettings.mailSmtpPort}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Encryption / Security</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    SSL / TLS
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Authentication Required</span>
                  <span className="font-semibold text-slate-700">Yes (Same as incoming username/password)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step App Guides */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <h3 className="text-base font-bold text-slate-900">Configuration Guides by Application</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
              {/* Apple Mail / iOS */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>Apple Mail (iPhone / iPad / Mac)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Open <strong>Settings &gt; Mail &gt; Accounts &gt; Add Account</strong>.</li>
                  <li>Choose <strong>Other</strong> and select <strong>Add Mail Account</strong>.</li>
                  <li>Enter your Name, full email address, and mailbox password.</li>
                  <li>Enter Incoming Host <code className="font-mono text-indigo-600">{mailSettings.mailImapHost}</code>.</li>
                  <li>Enter Outgoing Host <code className="font-mono text-indigo-600">{mailSettings.mailSmtpHost}</code>.</li>
                  <li>Save account. SSL is enabled by default.</li>
                </ol>
              </div>

              {/* Microsoft Outlook */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>Microsoft Outlook</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Open Outlook, navigate to <strong>File &gt; Add Account</strong>.</li>
                  <li>Type your email address and click <strong>Advanced options &gt; Let me set up manually</strong>.</li>
                  <li>Select <strong>IMAP</strong>.</li>
                  <li>Set Incoming Server: <code className="font-mono text-indigo-600">{mailSettings.mailImapHost}</code>, Port: 993, Encryption: SSL/TLS.</li>
                  <li>Set Outgoing Server: <code className="font-mono text-indigo-600">{mailSettings.mailSmtpHost}</code>, Port: 465, Encryption: SSL/TLS.</li>
                  <li>Enter password and complete test.</li>
                </ol>
              </div>

              {/* Mozilla Thunderbird */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                  <Laptop className="w-4 h-4 text-amber-600" />
                  <span>Mozilla Thunderbird</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Open Thunderbird, select <strong>Set up an account &gt; Email</strong>.</li>
                  <li>Enter your name, email address, and password.</li>
                  <li>Click <strong>Configure manually</strong>.</li>
                  <li>Set Protocol to IMAP with host <code className="font-mono text-indigo-600">{mailSettings.mailImapHost}</code> (Port 993).</li>
                  <li>Set Outgoing SMTP to <code className="font-mono text-indigo-600">{mailSettings.mailSmtpHost}</code> (Port 465).</li>
                  <li>Click <strong>Re-test</strong> and <strong>Done</strong>.</li>
                </ol>
              </div>

              {/* Android Gmail / Samsung Mail */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android (Gmail app / Native Mail)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Open Gmail app, tap your profile avatar &gt; <strong>Add another account</strong>.</li>
                  <li>Choose <strong>Other</strong>.</li>
                  <li>Enter your business email address and select <strong>Personal (IMAP)</strong>.</li>
                  <li>Enter your password.</li>
                  <li>Set Incoming server to <code className="font-mono text-indigo-600">{mailSettings.mailImapHost}</code> (Security: SSL/TLS).</li>
                  <li>Set Outgoing server to <code className="font-mono text-indigo-600">{mailSettings.mailSmtpHost}</code> (Security: SSL/TLS).</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Security & 2FA */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Two-Factor Authentication Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${twoFactorEnabled ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Two-Factor Authentication (2FA / TOTP)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Secure your account with time-based one-time authentication codes (RFC 6238).
                  </p>
                </div>
              </div>

              <div>
                {twoFactorEnabled ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2FA Active &amp; Enforced</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>2FA Disabled</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-3">
              <p>
                When two-factor authentication is active, logging in requires both your account password and a 6-digit verification code generated by an authenticator application on your smartphone (e.g. Google Authenticator, 1Password, Microsoft Authenticator, or Apple Passwords).
              </p>
              <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-[11px]">
                <Lock className="w-3.5 h-3.5" />
                <span>Compatible with all standard RFC 6238 TOTP authenticators.</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {twoFactorEnabled
                  ? "Your account is protected with two-factor authentication."
                  : "We strongly recommend enabling 2FA for all administrative accounts."}
              </div>

              {twoFactorEnabled ? (
                <button
                  type="button"
                  onClick={() => setShowDisableModal(true)}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowEnableModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Enable Two-Factor Authentication
                </button>
              )}
            </div>
          </div>

          {/* Active Device Sessions Card */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-indigo-600" />
                  <span>Active Browser &amp; Device Sessions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage active browser sessions across your desktop and mobile devices.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                disabled={revokingSessions || sessions.filter((s) => !s.isCurrent).length === 0}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 disabled:opacity-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{revokingSessions ? "Revoking..." : "Sign Out All Other Devices"}</span>
              </button>
            </div>

            {loadingSessions ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading active sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">No active sessions tracked.</div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        {session.userAgent.toLowerCase().includes("mobile") || session.userAgent.toLowerCase().includes("iphone") || session.userAgent.toLowerCase().includes("android") ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-md font-mono">
                            {session.userAgent}
                          </span>
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
                          <span>IP: {session.ipAddress}</span>
                          <span>•</span>
                          <span>Last active: {new Date(session.lastActiveAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enable 2FA Modal */}
      {showEnableModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Set Up Two-Factor Authentication</h3>
              </div>
              <button
                onClick={() => setShowEnableModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Secret Key */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Step 1: Add to Authenticator App
              </span>
              <p className="text-xs text-slate-500">
                Open your authenticator app (Google Authenticator, Apple Passwords, 1Password) and manually enter this secret key:
              </p>
              <div className="flex items-center space-x-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <code className="font-mono text-xs font-bold text-indigo-600 flex-1 break-all select-all">
                  {twoFactorSecret}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorSecret);
                    setSecretCopied(true);
                    setTimeout(() => setSecretCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold shrink-0 transition-colors flex items-center space-x-1"
                >
                  {secretCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{secretCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Emergency Backup Codes */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Step 2: Save Recovery Codes
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join("\n"));
                    setBackupCodesCopied(true);
                    setTimeout(() => setBackupCodesCopied(false), 2000);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center space-x-1"
                >
                  {backupCodesCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{backupCodesCopied ? "Copied All" : "Copy All Codes"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Store these single-use recovery codes safely. You can use one of these if you lose access to your authenticator.
              </p>
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono text-xs text-slate-700">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="p-1 bg-white rounded border border-slate-200/60 select-all">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Verification */}
            <form onSubmit={handleEnable2fa} className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Step 3: Enter 6-Digit Code
              </span>
              <div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456"
                  value={totpVerifyCode}
                  onChange={(e) => setTotpVerifyCode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEnableModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enabling2fa || totpVerifyCode.length !== 6}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors"
                >
                  {enabling2fa ? "Verifying..." : "Verify & Activate 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Disable Two-Factor Auth</h3>
              <button
                onClick={() => setShowDisableModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Please enter your current account password to confirm disabling two-factor authentication.
            </p>

            <form onSubmit={handleDisable2fa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling2fa}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors"
                >
                  {disabling2fa ? "Disabling..." : "Disable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
