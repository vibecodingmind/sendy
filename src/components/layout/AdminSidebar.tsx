"use client";

import React from "react";
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
  ArrowLeft,
  HeartPulse,
  Mail,
  HardDrive,
  LifeBuoy,
  Globe,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { label: "Platform Overview", href: "/admin", icon: Activity },
    { label: "Customers & Users", href: "/admin/customers", icon: Users },
    { label: "Payment Gateways", href: "/admin/payment-gateways", icon: CreditCard },
    { label: "Domain Registrar", href: "/admin/domain-registrar", icon: Globe },
    { label: "Mail Server Nodes", href: "/admin/servers", icon: Server },
    { label: "Support Tickets", href: "/admin/tickets", icon: LifeBuoy },
    { label: "System Health", href: "/admin/health", icon: HeartPulse },
    { label: "Email Activity Logs", href: "/admin/email-logs", icon: Mail },
    { label: "Abuse Center", href: "/admin/abuse", icon: ShieldAlert },
    { label: "System Backups", href: "/admin/backups", icon: HardDrive },
    { label: "Audit Logs", href: "/admin/logs", icon: FileText },
    { label: "System Settings", href: "/admin/settings", icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 flex flex-col justify-between py-5 px-3 min-h-[calc(100vh-4rem)]">
      <div>
        <div className="px-3 pb-4 mb-2 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Control Plane
          </span>
          <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono">
            SUPER_ADMIN
          </span>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Customer Portal</span>
        </Link>
      </div>
    </aside>
  );
}
