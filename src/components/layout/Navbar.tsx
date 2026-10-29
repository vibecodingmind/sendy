"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Shield,
  Search,
  Command,
  Inbox,
  ExternalLink,
  Globe,
} from "lucide-react";
import { OrganizationSwitcher, OrgOption } from "@/components/layout/OrganizationSwitcher";
import { isPublicSimulatedWebmailEnabled } from "@/lib/features/publicFlags";

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export function Navbar({
  brandName = "Monogram Mail",
  webmailUrl = "https://mail.monogrammail.com",
  variant = "light",
}: {
  brandName?: string;
  webmailUrl?: string;
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    domains: Array<{ id: string; name: string }>;
    mailboxes: Array<{ id: string; email: string }>;
  } | null>(null);

  const isDark = variant === "dark";
  const showSimulatedWebmail = isPublicSimulatedWebmailEnabled();
  const externalWebmail = webmailUrl?.startsWith("http") ? webmailUrl : `https://${webmailUrl}`;

  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user);
          setOrganizations(data.organizations || (data.organization ? [data.organization] : []));
          setActiveOrganizationId(data.activeOrganizationId || data.organization?.id || null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setSearchResults({ domains: data.domains || [], mailboxes: data.mailboxes || [] });
        })
        .catch(() => setSearchResults(null));
    }, 280);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      if (searchResults?.mailboxes?.[0]) {
        router.push("/mailboxes");
      } else if (searchResults?.domains?.[0]) {
        router.push("/domains");
      } else {
        router.push(`/domains`);
      }
      setSearchFocused(false);
    },
    [router, searchQuery, searchResults]
  );

  return (
    <header
      className={`h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors backdrop-blur-md ${
        isDark
          ? "bg-slate-950/90 border-b border-slate-800/80 text-slate-100"
          : "bg-white/95 border-b border-slate-200/90 text-slate-900 shadow-2xs"
      }`}
    >
      {/* ── Left: Logo Layout & Organization Badge ── */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <Link
          href={user?.role === "SUPER_ADMIN" ? "/admin" : "/dashboard"}
          className="flex items-center space-x-3 group"
        >
          {/* Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Mail className="w-4 h-4" />
          </div>

          {/* Logo Typography & Edition Tag */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span
                className={`font-black text-base sm:text-lg tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Monogram<span className="text-indigo-600">Mail</span>
              </span>
              <span
                className={`hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isDark
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {isDark ? "Control Plane" : "v2.4 Pro"}
              </span>
            </div>
          </div>
        </Link>

        {organizations.length > 0 && (
          <div className="hidden md:block">
            <OrganizationSwitcher
              organizations={organizations}
              activeOrganizationId={activeOrganizationId}
              dark={isDark}
            />
          </div>
        )}
      </div>

      {/* ── Center: global search ── */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-8 relative">
        <form onSubmit={submitSearch} className="w-full">
          <div
            className={`w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs transition-all border ${
              isDark
                ? searchFocused
                  ? "bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 text-white"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                : searchFocused
                ? "bg-white border-indigo-500 ring-2 ring-indigo-500/15 text-slate-900 shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-100/60"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mailboxes and domains..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              className="w-full bg-transparent border-none outline-none text-xs placeholder:text-slate-400"
              aria-label="Search mailboxes and domains"
            />
            <div className="flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-[10px] font-mono text-slate-500 shrink-0">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>
        </form>
        {searchFocused && searchResults && (searchResults.domains.length > 0 || searchResults.mailboxes.length > 0) && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 text-xs max-h-64 overflow-auto">
            {searchResults.domains.map((d) => (
              <Link
                key={d.id}
                href="/domains"
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                {d.name}
              </Link>
            ))}
            {searchResults.mailboxes.map((m) => (
              <Link
                key={m.id}
                href="/mailboxes"
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700 font-mono"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                {m.email}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Operational Status, Webmail, & Pro Actions ── */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Real-time System Health Indicator */}
        <div
          className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
            isDark
              ? "bg-slate-900/80 border-slate-800 text-slate-300"
              : "bg-emerald-50/60 border-emerald-200/70 text-emerald-800"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-semibold">Operational</span>
        </div>

        {/* Super Admin Switch (if applicable) */}
        {user && user.role === "SUPER_ADMIN" && !isDark && (
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>Control Plane</span>
          </Link>
        )}

        <a
          href={externalWebmail}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Webmail</span>
        </a>
        {showSimulatedWebmail && (
          <Link
            href="/webmail"
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Inbox className="w-4 h-4" />
            <span>Preview</span>
          </Link>
        )}
      </div>
    </header>
  );
}
