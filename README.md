# Monogram Mail — Managed Business Email Hosting SaaS (Powered by iRedMail)

Monogram Mail is a production-grade, multi-tenant Business Email Hosting SaaS platform. It provides custom domain email hosting, automated DNS verification, mailbox provisioning, aliases, forwarders, billing, and system health observability, with an underlying email infrastructure powered initially by **iRedMail** (Postfix, Dovecot, Rspamd).

---

## 1. Product Overview

Monogram Mail is specifically engineered for **professional email hosting as a service**:
- **Customer Self-Service Portal**: 7-step onboarding wizard, domain management, mailbox creation, password resets, email aliases, mail forwarders, real-time resource usage, subscription upgrades, and 1-click Webmail entry.
- **Automated Live DNS Verification**: Real-time resolution and comparison for MX, SPF, DKIM (2048-bit RSA), and DMARC records with copyable registrar instructions.
- **Super Admin Control Plane**: Customer organization management, multi-server cluster orchestration (`MAIL-01`, `MAIL-02`), live connectivity monitors (SMTP/IMAP/DB ping), abuse prevention center, centralized branding/settings, and append-only audit logs.
- **Zero iRedMail Admin Exposure**: Normal customers never interact with or see underlying Postfix, Dovecot, or Linux interfaces.

---

## 2. Architecture & Design Principles

```text
┌─────────────────────────────────────────────────────────┐
│                      CUSTOMER WEB                       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 CONTROL PLANE (Next.js 15)              │
│  - Customer Portal              - Super Admin Console   │
│  - Multi-Tenant RBAC Guards     - Live DNS Verifier     │
│  - Billing & Invoicing          - Append-Only Audit Log │
└─────────────┬─────────────────────────────┬─────────────┘
              │                             │
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     Primary Database      │ │  MailProvider Abstraction │
│   (PostgreSQL / SQLite)   │ └─────────────┬─────────────┘
└───────────────────────────┘               │
                                            ▼
                              ┌───────────────────────────┐
                              │     IRedMailProvider      │
                              │  - vmail Database Engine  │
                              │  - Dovecot SSHA512 Hasher │
                              │  - Rspamd DKIM Key Gen    │
                              └─────────────┬─────────────┘
                                            │
                                            ▼ TLS / Restricted Network
                              ┌───────────────────────────┐
                              │  iRedMail Infrastructure  │
                              │  - Postfix (SMTP 465/587) │
                              │  - Dovecot (IMAP 993)     │
                              │  - Roundcube Webmail      │
                              │  - Rspamd (Spam & DKIM)   │
                              └───────────────────────────┘
```

### Decoupled MailProvider Interface
Business logic is decoupled from iRedMail through the `MailProvider` interface:
- `createDomain(options)` / `deleteDomain(domain)` / `suspendDomain(domain)` / `activateDomain(domain)`
- `createMailbox(options)` / `updateMailbox(email, options)` / `deleteMailbox(email)` / `changeMailboxPassword(email, plain, hash)`
- `createAlias(alias, target)` / `deleteAlias(alias, target)`
- `createForwarder(source, target, keepLocal)` / `deleteForwarder(source, target)`
- `getOrCreateDkimRecord(domain, selector)` / `checkServerHealth()`

Supported implementations:
- `IRedMailProvider`: Direct connection to iRedMail SQL `vmail` schema with Dovecot SSHA512 password hashing.
- `MockMailProvider`: High-fidelity in-memory provider for unit tests and local development.
- `MailServerAllocator`: Dynamically balances tenant domains across servers (`MAIL-01`, `MAIL-02`).

---

## 3. Local Development

### Prerequisites
- Node.js 20+ (tested on Node 22 & 25)
- npm 10+

### Setup
1. Clone the repository:
   ```bash
   git clone <repo-url> mailoo
   cd mailoo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Initialize database schema & seed initial demo data:
   ```bash
   npx prisma generate
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

5. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Default Seed Credentials

- **Super Admin (Control Plane)**:
  - Email: `admin@monogrammail.com`
  - Password: `AdminPass123!`
  - URL: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Customer Admin (Organization Owner)**:
  - Email: `owner@democorp.com`
  - Password: `DemoPass123!`
  - URL: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 5. Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_NAME` | Configurable platform brand name | `Monogram Mail` |
| `APP_URL` | Base URL of the SaaS control plane | `http://localhost:3000` |
| `DATABASE_URL` | Prisma DB connection string (SQLite or PostgreSQL) | `file:./dev.db` |
| `JWT_SECRET` | Secret key for session authentication tokens | `dev-jwt-secret-min-32-chars` |
| `MAIL_PROVIDER` | Active mail provider (`mock` or `iredmail`) | `mock` |
| `MAIL_WEBMAIL_URL` | URL to customer webmail entry point | `https://mail.monogrammail.com` |
| `MAIL_IMAP_HOST` | Hostname for incoming IMAP connections | `imap.monogrammail.com` |
| `MAIL_IMAP_PORT` | Port for incoming IMAP connections | `993` |
| `MAIL_SMTP_HOST` | Hostname for outgoing SMTP connections | `smtp.monogrammail.com` |
| `MAIL_SMTP_PORT` | Port for outgoing SMTP connections | `465` |
| `MAIL_MX_HOST` | Primary MX record hostname for customer domains | `mx1.monogrammail.com` |
| `MAIL_MX_PRIORITY` | Primary MX priority | `10` |
| `IREDMAIL_DB_TYPE` | iRedMail database type (`mysql` or `postgres`) | `mysql` |
| `IREDMAIL_DB_HOST` | iRedMail host IP or private network address | `127.0.0.1` |
| `IREDMAIL_DB_USER` | iRedMail database administrative user | `vmailadmin` |
| `IREDMAIL_DB_PASSWORD` | iRedMail database password | `secret` |
| `IREDMAIL_DB_NAME` | iRedMail database name | `vmail` |
| `PAYMENT_PROVIDER` | Payment processor (`mock` or `stripe`) | `mock` |

---

## 6. iRedMail Integration Details

iRedMail stores accounts, domains, quotas, and forwarders in its `vmail` database. `IRedMailProvider` operates on these tables:
1. **`domain`**: Provisions custom hosted domains with quota and mailbox limits.
2. **`mailbox`**: Provisions individual accounts with Dovecot `{SSHA512}` encrypted passwords, maildir path (`domain/username/`), and storage quotas.
3. **`alias` & `forwardings`**: Handles email aliases and external forwarders with local mailbox delivery preservation.
4. **`used_quota`**: Reads real-time mailbox disk consumption recorded by Dovecot's quota dictionary plugin.

To connect a remote iRedMail node in production:
1. Grant the SaaS server IP access to the iRedMail MySQL/PostgreSQL port (3306 or 5432) over a private VPC or WireGuard VPN.
2. Set `MAIL_PROVIDER="iredmail"` and fill in the `IREDMAIL_DB_*` credentials in `.env`.
3. In the Super Admin Portal, navigate to **Mail Server Nodes** and test cluster connectivity.

---

## 7. Automated Testing Suite

The codebase includes automated unit, isolation, and end-to-end test suites:

```bash
npm test
```

### Test Coverage:
- `tests/auth.test.ts`: Password hashing (bcrypt), Dovecot `{SSHA512}` generation & validation, JWT sign & verify.
- `tests/tenant-isolation.test.ts`: Strict multi-tenant boundaries (Tenant A cannot access Tenant B's domains, mailboxes, or billing).
- `tests/dns.test.ts`: Live DNS resolution logic for MX, SPF, DKIM, and DMARC with error handling.
- `tests/mail-provider.test.ts`: MailProvider abstraction, domain/mailbox provisioning, aliases, forwarders, DKIM RSA keys, and health checks.
- `tests/e2e-journey.test.ts`: Complete customer journey from registration -> plan choice -> domain connection -> DNS verification -> mailbox provisioning -> usage calculation -> invoice generation.

---

## 8. Production Deployment

### Recommended Topology
- **Server A (Control Plane)**: Next.js SaaS application + PostgreSQL database behind Nginx / Caddy with TLS.
- **Server B (Mail Infrastructure)**: Dedicated Linux host running iRedMail (Postfix, Dovecot, Rspamd, Roundcube) with reverse PTR and port 25/465/993 open to the internet.
- **Private VPC / WireGuard**: Secure TLS connection between Server A and Server B for database updates.

### Production Build & Run
```bash
npm run build
npm start
```

---

## 9. Security Features

1. **Tenant Isolation**: Every API endpoint derives tenant context strictly from the server-side authenticated session. Client-supplied organization IDs are never trusted.
2. **Password Security**: Passwords are never stored in plaintext. Application logins use `bcrypt` (10 rounds), and mailboxes use Dovecot-standard `{SSHA512}` with cryptographic salt.
3. **Audit Trail**: Every domain creation, mailbox password reset, plan upgrade, and admin action is recorded in an immutable `AuditLog` table with IP address and metadata.
4. **Abuse Protection**: Outbound transmission rate limits (500 emails/day), suspicious login alerts, and one-click account suspension.
