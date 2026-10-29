"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Mail,
  Share2,
  CornerUpRight,
  Globe,
  Radio,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
  LifeBuoy,
  Inbox,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ChevronRight,
  Shield,
  User,
  MoreVertical,
  PenTool,
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

interface AuthOrg {
  id: string;
  name: string;
  slug: string;
}

export function CustomerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<AuthOrg | null>(null);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  // Fetch current user and organization
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user);
          setOrg(data.organization);
          setOrganizations(data.organizations || (data.organization ? [data.organization] : []));
          setActiveOrganizationId(data.activeOrganizationId || data.organization?.id || null);
        }
      })
      .catch(() => {});
  }, []);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("sidebar_collapsed", String(next));
    } catch {}
  };

  const handleLogout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const emailNavItems = [
    ...(isPublicSimulatedWebmailEnabled()
      ? [{ label: "Webmail (preview)", href: "/webmail", icon: Inbox, badge: "beta" as const }]
      : []),
    { label: "Mailboxes", href: "/mailboxes", icon: Mail },
        { label: "Aliases", href: "/aliases", icon: Share2 },
        { label: "Forwarders", href: "/forwarders", icon: CornerUpRight },
    { label: "Signatures", href: "/signatures", icon: PenTool },
  ];

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
      group: "Email",
      items: emailNavItems,
    },
    { label: "Domains", href: "/domains", icon: Globe },
    { label: "DNS Setup", href: "/dns-setup", icon: Radio },
    { label: "Usage", href: "/usage", icon: BarChart3 },
    { label: "Billing", href: "/billing", icon: CreditCard },
    { label: "Account & Settings", href: "/settings", icon: Settings },
    { label: "Support & Help", href: "/support", icon: LifeBuoy },
  ];

  // Derive user initials
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName ? user.lastName[0] : ""}`.toUpperCase()
    : (user?.email?.[0] || "U").toUpperCase();

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.email?.split("@")[0] || "User";

  return (
    <aside
      className={`bg-white/85 backdrop-blur-md border-r border-slate-200/80 shrink-0 flex flex-col justify-between py-4 px-3 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out relative z-20 shadow-soft ${
        collapsed ? "w-[4.5rem]" : "w-64"
      }`}
    >
      {/* Top Section */}
      <div className="space-y-4">
        {/* Collapse / Expand Button */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1 pb-1`}>
          {!collapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </span>
          )}
          <button
            onClick={toggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => {
            if ("group" in item && item.items) {
              return (
                <div key={idx} className="pt-2 pb-1">
                  {!collapsed ? (
                    <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                      {item.group}
                    </p>
                  ) : (
                    <div className="my-2 border-t border-slate-100 mx-2" />
                  )}
                  <div className="space-y-0.5">
                    {item.items.map((sub) => {
                      const isActive = pathname === sub.href;
                      const Icon = sub.icon;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          title={collapsed ? sub.label : undefined}
                          className={`flex items-center ${
                            collapsed ? "justify-center px-0 py-2.5" : "space-x-3 px-3 py-2"
                          } rounded-lg text-sm font-medium transition-all group relative ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-semibold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          />
                          {!collapsed && (
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{sub.label.replace(" (preview)", "")}</span>
                              {"badge" in sub && sub.badge === "beta" && (
                                <span className="badge-beta shrink-0">Beta</span>
                              )}
                            </span>
                          )}

                          {/* Hover Tooltip when collapsed */}
                          {collapsed && (
                            <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                              {sub.label}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const singleItem = item as {
              label: string;
              href: string;
              icon: React.ComponentType<{ className?: string }>;
            };
            const isActive = pathname === singleItem.href;
            const Icon = singleItem.icon;
            return (
              <Link
                key={singleItem.href}
                href={singleItem.href}
                title={collapsed ? singleItem.label : undefined}
                className={`flex items-center ${
                  collapsed ? "justify-center px-0 py-2.5" : "space-x-3 px-3 py-2"
                } rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {!collapsed && <span>{singleItem.label}</span>}

                {/* Hover Tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                    {singleItem.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Setup Wizard & User Profile Avatar */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        {/* Quick Onboarding / Wizard Callout */}
        {!collapsed ? (
          <div className="p-3 bg-gradient-to-br from-indigo-50/90 via-indigo-50/40 to-slate-50 rounded-xl border border-indigo-100/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1.5 text-indigo-700">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold">Setup Wizard</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                7 Steps
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
              New domain? Configure DNS & mailboxes in minutes.
            </p>
            <Link
              href="/onboarding"
              className="flex items-center justify-center space-x-1.5 w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <span>Launch Wizard</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="flex justify-center">
            <Link
              href="/onboarding"
              title="Setup Wizard"
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors relative group"
            >
              <Sparkles className="w-5 h-5" />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 whitespace-nowrap">
                Setup Wizard
              </div>
            </Link>
          </div>
        )}

        {/* ── User Avatar & Profile Card (Bottom Left) ── */}
        <div className="relative" ref={profileRef}>
          {/* Profile Card Trigger Button */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`w-full flex items-center ${
              collapsed ? "justify-center p-1.5" : "space-x-3 p-2"
            } rounded-xl hover:bg-slate-100 transition-colors group text-left`}
            title={collapsed ? `${displayName} (${user?.email})` : undefined}
          >
            {/* Avatar Circle with Online Status Dot */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-xs ring-2 ring-white">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            {/* Name & Email (When Expanded) */}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-400 truncate font-mono">
                  {user?.email || "loading..."}
                </p>
              </div>
            )}

            {!collapsed && (
              <MoreVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
            )}
          </button>

          {/* Profile Popup Menu */}
          {profileOpen && (
            <div
              className={`absolute bottom-full mb-2 ${
                collapsed ? "left-14 w-60" : "left-0 right-0"
              } bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100`}
            >
              {/* Profile Header */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-1">
                <p className="font-bold text-slate-900 text-sm">{displayName}</p>
                <p className="text-slate-500 text-[11px] font-mono truncate">{user?.email}</p>
                {organizations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <OrganizationSwitcher
                      organizations={organizations}
                      activeOrganizationId={activeOrganizationId}
                      compact
                    />
                  </div>
                )}
                {org && organizations.length <= 1 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Organization:</span>
                    <span className="font-semibold text-slate-700">{org.name}</span>
                  </div>
                )}
                {user?.role === "SUPER_ADMIN" && (
                  <div className="mt-1 flex items-center space-x-1 text-amber-700 font-bold text-[10px]">
                    <Shield className="w-3 h-3 text-amber-500" />
                    <span>SUPER_ADMIN ACCESS</span>
                  </div>
                )}
              </div>

              {/* Links */}
              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center space-x-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Client Setup & Settings</span>
              </Link>

              <Link
                href="/support"
                onClick={() => setProfileOpen(false)}
                className="flex items-center space-x-2.5 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                <LifeBuoy className="w-4 h-4 text-slate-400" />
                <span>Help & Support</span>
              </Link>

              {user?.role === "SUPER_ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center space-x-2.5 px-3 py-2 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors font-medium"
                >
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span>Admin Control Plane</span>
                </Link>
              )}

              <div className="border-t border-slate-100 my-1" />

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
