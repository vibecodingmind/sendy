import Link from "next/link";
import {
  Mail,
  Shield,
  Globe,
  Zap,
  Server,
  ArrowRight,
  CheckCircle2,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Custom domain email",
    desc: "Connect your domain, verify MX/SPF/DKIM/DMARC, and provision team mailboxes in minutes.",
  },
  {
    icon: Server,
    title: "Carrier-grade stack",
    desc: "Built for iRedMail — Postfix, Dovecot, and Rspamd behind a clean control plane.",
  },
  {
    icon: Shield,
    title: "Security first",
    desc: "Tenant isolation, audit logs, abuse controls, and production-hardened billing webhooks.",
  },
  {
    icon: Zap,
    title: "Operator clarity",
    desc: "One dashboard for domains, mailboxes, billing, and support — no cPanel required.",
  },
];

const plans = [
  { name: "Starter", price: "$5", mailboxes: "5", domains: "1" },
  { name: "Business", price: "$15", mailboxes: "25", domains: "3", highlight: true },
  { name: "Enterprise", price: "$49", mailboxes: "100", domains: "10" },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-100 overflow-x-hidden">
      <div className="auth-grid absolute inset-0 pointer-events-none opacity-60" />
      <div className="auth-glow absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[480px] pointer-events-none" />

      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center shadow-glow">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            Monogram<span className="text-brand-400">Mail</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="btn-ghost text-slate-300 hover:text-white hover:bg-white/5">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm py-2 px-4">
            Start free trial
          </Link>
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <section className="pt-12 sm:pt-20 pb-16 text-center max-w-3xl mx-auto animate-slide-up">
          <p className="badge-live mb-4 mx-auto w-fit">Business email hosting SaaS</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]">
            Professional email for teams that{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-400">
              own their domain
            </span>
          </h1>
          <p className="mt-6 text-slate-400 text-base sm:text-lg leading-relaxed">
            Provision mailboxes, enforce DNS authentication, and manage subscriptions — without exposing
            raw mail server admin panels to customers.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="btn-primary w-full sm:w-auto px-8 py-3 text-base">
              Create organization
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3 text-base font-semibold rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
            >
              Admin / customer login
            </Link>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur p-5 hover:border-brand-500/30 transition-colors"
            >
              <f.icon className="w-8 h-8 text-brand-400 mb-3" />
              <h3 className="font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="mb-20">
          <h2 className="font-display text-2xl font-bold text-center mb-8">Simple, transparent pricing</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-6 border ${
                  p.highlight
                    ? "border-brand-500/50 bg-brand-500/10 shadow-glow"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <h3 className="font-display font-bold text-xl">{p.name}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-slate-400 text-sm">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {p.mailboxes} mailboxes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {p.domains} domain{p.domains !== "1" ? "s" : ""}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/20 to-cyan-600/10 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Building2 className="w-10 h-10 text-brand-300 shrink-0" />
            <div>
              <h2 className="font-display text-xl font-bold">Ready to launch your mail platform?</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-md">
                Deploy the control plane on your VPS, connect iRedMail, and start onboarding customers.
              </p>
            </div>
          </div>
          <Link href="/register" className="btn-primary shrink-0">
            Get started
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-slate-500 space-y-2">
        <p>Monogram Mail · Enterprise email control plane</p>
        <Link href="/status" className="text-brand-300 hover:text-brand-200">
          System status
        </Link>
      </footer>
    </div>
  );
}
