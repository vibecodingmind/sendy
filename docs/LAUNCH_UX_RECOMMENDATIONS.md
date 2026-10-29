# Launch UX & Product Recommendations — Monogram Mail

**Purpose:** Guide a world-class v1 launch after the UI refresh (design system, landing page, dashboard patterns).  
**Audience:** Product, engineering, and operations.

---

## 1. What changed in this UI pass

| Area | Change |
|------|--------|
| Design system | [`globals.css`](../src/app/globals.css), [`tailwind.config.ts`](../tailwind.config.ts) — tokens, buttons, cards, badges |
| Typography | Plus Jakarta Sans + DM Sans via [`layout.tsx`](../src/app/layout.tsx) |
| Marketing | Public [`LandingPage`](../src/components/marketing/LandingPage.tsx) at `/` (logged-out users) |
| Customer shell | `surface-app` background, sidebar glass effect, **Beta** label on built-in webmail |
| Dashboard | [`PageHeader`](../src/components/ui/PageHeader.tsx), [`StatCard`](../src/components/ui/StatCard.tsx), product notice |
| Auth | Unified dark auth backdrop (`auth-grid`, `auth-glow`) |
| Honesty UX | [`ProductNotice`](../src/components/ui/ProductNotice.tsx) explains webmail vs real IMAP |

---

## 2. Features to **remove** or hide before world-class launch

| Feature | Why | Action |
|---------|-----|--------|
| **Built-in webmail as primary** | Simulated `WebmailMessage` DB — not real IMAP; misleads customers | Default to Roundcube URL; demote or gate `/webmail` behind `ENABLE_SIMULATED_WEBMAIL` |
| **Seed / demo emails** | Auto-seeded inbox in [`webmail/mailboxes/route.ts`](../src/app/api/v1/webmail/mailboxes/route.ts) | Remove in production or flag with env |
| **Admin email logs (mock)** | Hardcoded sample data | Hide nav item until Postfix log ingestion exists |
| **Admin backups (mock)** | No real backup job | Hide or label “Coming soon”; use [`scripts/backup-saas.sh`](../scripts/backup-saas.sh) in ops only |
| **Domain registrar (mock)** | `MockRegistrarProvider` only | Hide from admin until real registrar API |
| **Abuse center mock incidents** | Static list in UI | Already wired to API for suspend; remove fake incident table |
| **Prayer Warriors folder** | Unrelated repo content | Keep out of git (already ignored) |
| **Demo quick-fill credentials on login** | Security risk in production | Hide when `NODE_ENV=production` |

---

## 3. Features to **add** (high impact for launch)

| Priority | Feature | Rationale |
|----------|---------|-----------|
| P0 | **Roundcube SSO or deep link** with mailbox context | Core “read email” experience |
| P0 | **DKIM install on Rspamd** from control plane | DNS verify alone does not sign mail |
| P0 | **Real mail log viewer** (Postfix/Rspamd tail or Loki) | Replace mock admin email logs |
| P1 | **Organization switcher** | Multi-org users (`memberships[0]` limit today) |
| P1 | **Grace period + auto-suspend cron** | Billing lifecycle automation |
| P1 | **Email verification gate** | Block billing/mailbox until verified |
| P1 | **Status page** (`/status`) | Public uptime for SaaS trust |
| P2 | **Mailbox user role portal** | `MAILBOX_USER` login → webmail only |
| P2 | **CSV export** domains/mailboxes for admins | Migration & support |
| P2 | **In-app onboarding checklist** | Replace generic 7-step wizard with state from API |
| P3 | **White-label** (logo, colors from `SystemSetting`) | Agency/reseller model |
| P3 | **Multi-language** (EN + SW) | Tanzania/East Africa market fit |

---

## 4. Features to **improve** (keep, but polish)

| Feature | Improvement |
|---------|-------------|
| Onboarding | Drive from real domain/mailbox state; skip completed steps |
| DNS setup | Single “copy all records” + registrar-specific help links |
| Mailboxes | Bulk create, import CSV, send setup email via real SMTP |
| Billing | Show AzamPay + Stripe status clearly; receipt PDF |
| Signatures | Persist per mailbox in DB (today mostly client-side) |
| Support tickets | Email notify on staff reply |
| Admin servers | Edit `metadata` via secure form, not raw JSON in UI |
| Search (navbar) | Wire to global search API or remove until implemented |
| Mobile | Test webmail and sidebar drawer on small screens |
| Accessibility | Focus rings, aria labels on sidebar collapse |

---

## 5. UX principles for ongoing work

1. **Never fake production behavior** — label Beta/Mock clearly (badges in nav).
2. **One primary action per screen** — e.g. dashboard: “Create mailbox” when DNS verified.
3. **Progressive disclosure** — advanced DNS, auto-responder, signatures behind tabs.
4. **Consistent components** — use `PageHeader`, `StatCard`, `btn-primary` on every customer page.
5. **Empty states** — every list page needs illustration + CTA (domains, mailboxes, tickets).

---

## 6. Testing checklist (run before launch)

```bash
npm test          # 32 unit/integration tests
npm run build     # production compile
```

Manual flows:

- [ ] Landing → register → onboarding → domain → verify DNS → mailbox
- [ ] Login → dashboard metrics match DB
- [ ] Billing checkout (sandbox Stripe / AzamPay simulate off in prod)
- [ ] Admin suspend org → customer API blocked
- [ ] Open Roundcube from navbar
- [ ] 2FA login path
- [ ] Mobile width 375px — sidebar + dashboard

---

## 7. Suggested launch positioning

**Monogram Mail** = *Business email control plane* (domains, mailboxes, billing, compliance) + **your** iRedMail cluster — not a consumer webmail clone.

Tagline options:

- “Professional email hosting without cPanel.”
- “Verify DNS. Provision mailboxes. Bill customers. One dashboard.”

---

## 8. Next UI engineering sprint (recommended order)

1. Apply `PageHeader` + `surface-card` to: domains, mailboxes, billing, settings (template from dashboard).
2. ~~Production-gate demo login buttons and webmail seed data.~~ Done: login demo buttons hidden in production; seeding gated by [`flags.ts`](../src/lib/features/flags.ts) (`ENABLE_SIMULATED_WEBMAIL`).
3. ~~Admin: hide mock pages~~ Done in production nav (registrar, email logs, backups); override with `NEXT_PUBLIC_ENABLE_ADMIN_SIMULATION_NAV=true`.
4. Optional: dark mode toggle using CSS variables (brand already supports light customer + dark admin).

See also: [CODEBASE_AUDIT.md](./CODEBASE_AUDIT.md), [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md).
