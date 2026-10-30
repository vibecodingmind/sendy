"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Users,
  Server,
  ShieldAlert,
  FileText,
  Sliders,
  CreditCard,
  HeartPulse,
  Mail,
  HardDrive,
  LifeBuoy,
  Globe,
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
  LayoutGrid,
  Wrench,
  Shield,
} from "lucide-react";

const SIMULATION_HREFS = new Set([
  "/admin/domain-registrar",
  "/admin/email-logs",
  "/admin/backups",
]);

type NavLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  simulation?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavLink[];
};

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const showSimulationNav =
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_SIMULATION_NAV === "true" ||
    process.env.NODE_ENV !== "production";

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) setCollapsed(saved === "true");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("admin_sidebar_collapsed", String(next));
    } catch {
      /* ignore */
    }
  };

  const groups: NavGroup[] = [
    {
      id: "overview",
      label: "Overview",
      items: [{ label: "Dashboard", href: "/admin", icon: Activity }],
    },
    {
      id: "business",
      label: "Customers & billing",
      items: [
        { label: "Organizations", href: "/admin/customers", icon: Users },
        { label: "Payment gateways", href: "/admin/payment-gateways", icon: CreditCard },
        { label: "Support tickets", href: "/admin/tickets", icon: LifeBuoy },
      ],
    },
    {
      id: "infra",
      label: "Mail infrastructure",
      items: [
        { label: "Server nodes", href: "/admin/servers", icon: Server },
        { label: "System health", href: "/admin/health", icon: HeartPulse },
        {
          label: "Domain registrar",
          href: "/admin/domain-registrar",
          icon: Globe,
          simulation: true,
        },
        {
          label: "Delivery logs",
          href: "/admin/email-logs",
          icon: Mail,
          simulation: true,
        },
        {
          label: "Backups",
          href: "/admin/backups",
          icon: HardDrive,
          simulation: true,
        },
      ],
    },
    {
      id: "security",
      label: "Security & compliance",
      items: [
        { label: "Abuse center", href: "/admin/abuse", icon: ShieldAlert },
        { label: "Audit logs", href: "/admin/logs", icon: FileText },
      ],
    },
    {
      id: "config",
      label: "Platform",
      items: [{ label: "System settings", href: "/admin/settings", icon: Sliders }],
    },
  ];

  const filteredGroups = groups.map((g) => ({
    ...g,
    items: g.items.filter((item) => showSimulationNav || !SIMULATION_HREFS.has(item.href)),
  }));

  const renderLink = (link: NavLink) => {
    const isActive = pathname === link.href;
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        title={collapsed ? link.label : undefined}
        className={`admin-nav-item ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"} ${
          isActive ? "admin-nav-active" : "admin-nav-idle"
        } group`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-300"}`} />
        {!collapsed && (
          <span className="flex-1 flex items-center gap-2 min-w-0">
            <span className="truncate">{link.label}</span>
            {link.simulation && showSimulationNav && (
              <span className="shrink-0 text-[9px] font-bold uppercase px-1 py-0 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Sim
              </span>
            )}
          </span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg border border-slate-700 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            {link.label}
            {link.simulation ? " (simulation)" : ""}
          </div>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`shrink-0 flex flex-col border-r border-slate-800/80 bg-ink-900/60 backdrop-blur-md min-h-[calc(100vh-4rem)] transition-all duration-300 ${
        collapsed ? "w-[4.5rem] px-2 py-4" : "w-64 px-3 py-5"
      }`}
    >
      <div className="flex-1 space-y-1 overflow-y-auto">
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1 pb-3 mb-2 border-b border-slate-800/80`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Navigation
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {filteredGroups.map((group) => (
          <div key={group.id} className="pt-2 pb-1">
            {!collapsed ? (
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-600 uppercase mb-1.5">
                {group.label}
              </p>
            ) : (
              <div className="my-2 border-t border-slate-800/80 mx-1" />
            )}
            <nav className="space-y-0.5">{group.items.map(renderLink)}</nav>
          </div>
        ))}
      </div>

      <div className="pt-3 mt-2 border-t border-slate-800/80 space-y-1">
        {!collapsed && (
          <div className="mx-1 mb-2 p-3 rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2 text-amber-400/90">
              <Wrench className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">Launch checklist</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Connect iRedMail, webhooks, and DKIM before customer go-live.
            </p>
            <Link
              href="/status"
              target="_blank"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300"
            >
              Public status
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        <Link
          href="/dashboard"
          title={collapsed ? "Customer portal" : undefined}
          className={`admin-nav-item admin-nav-idle ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}`}
        >
          <Shield className="w-4 h-4 text-slate-500" />
          {!collapsed && <span>Exit to customer portal</span>}
        </Link>
      </div>
    </aside>
  );
}
