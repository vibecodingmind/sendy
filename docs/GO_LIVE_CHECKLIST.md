# Go-live checklist (Monogram Mail)

Use this after configuring production secrets on the control-plane VPS.

## 1. Control plane (this app)

- [ ] Copy `.env.production.example` → `.env` (never commit).
- [ ] Set `NODE_ENV=production`, strong `JWT_SECRET`, `CRON_SECRET`.
- [ ] Set `DATABASE_URL` to PostgreSQL (matches Docker Compose).
- [ ] Set `MAIL_PROVIDER=iredmail` and all `IREDMAIL_DB_*` values (private network to mail node).
- [ ] Set `PAYMENT_PROVIDER` to `stripe` or `azampay` (not `mock`).
- [ ] Set `STRIPE_WEBHOOK_SECRET` / `AZAMPAY_WEBHOOK_SECRET` and register webhook URLs with providers.
- [ ] Set `AZAMPAY_SIMULATE=false`.
- [ ] Configure `SYSTEM_SMTP_*` for password reset and notifications.
- [ ] Run migrations: `npx prisma db push` or migrate deploy against production DB.
- [ ] Build and deploy: `docker compose -f docker-compose.prod.yml up -d --build`.

## 2. Mail infrastructure (separate host)

- [ ] iRedMail installed with Postfix, Dovecot, Rspamd, Roundcube.
- [ ] vmail MySQL/MariaDB reachable only from control-plane IP/VPN.
- [ ] MX, SPF, DKIM (Rspamd), DMARC for platform and customer domains.
- [ ] PTR/reverse DNS aligned with `MAIL_MX_HOST`.
- [ ] `MAIL_WEBMAIL_URL` points to Roundcube (or SOGo).
- [ ] End-to-end test: provision domain → create mailbox → IMAP login → send/receive external mail.

## 3. Scheduled jobs

```bash
# Quota sync (hourly example)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.example.com/api/cron/quota-sync

# DNS check (daily example)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.example.com/api/cron/dns-check
```

## 4. Smoke tests

- [ ] Register → add domain → verify DNS → create mailbox (with `iredmail` provider).
- [ ] Checkout with real payment (small plan) → subscription `ACTIVE` only after webhook.
- [ ] Super admin suspend customer → mailboxes suspended on mail server.
- [ ] `/api/health` returns `healthy`.

See [CODEBASE_AUDIT.md](./CODEBASE_AUDIT.md) for architecture and remaining differentiation items (DKIM install on Rspamd, real mail log ingestion, etc.).
