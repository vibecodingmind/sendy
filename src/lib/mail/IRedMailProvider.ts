import {
  MailProvider,
  DomainProvisionOptions,
  MailboxProvisionOptions,
  MailboxUpdateOptions,
  MailboxUsage,
  DomainUsage,
  DkimKeyInfo,
  ServerHealthStatus,
} from "./MailProvider";
import { hashDovecotPassword } from "../auth/password";
import net from "net";
import crypto from "crypto";

export interface IRedMailConfig {
  dbType: "mysql" | "postgres";
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  smtpHost?: string;
  smtpPort?: number;
  imapHost?: string;
  imapPort?: number;
  storageNode?: string; // e.g., 'vmail1'
}

/**
 * Production iRedMail Provider.
 * Directly integrates with iRedMail's `vmail` database schema and Dovecot/Rspamd services.
 */
export class IRedMailProvider implements MailProvider {
  readonly providerName = "iredmail";
  private config: IRedMailConfig;

  constructor(config?: Partial<IRedMailConfig>) {
    this.config = {
      dbType: (process.env.IREDMAIL_DB_TYPE as "mysql" | "postgres") || "mysql",
      host: process.env.IREDMAIL_DB_HOST || "127.0.0.1",
      port: parseInt(process.env.IREDMAIL_DB_PORT || "3306", 10),
      user: process.env.IREDMAIL_DB_USER || "vmailadmin",
      password: process.env.IREDMAIL_DB_PASSWORD || "",
      database: process.env.IREDMAIL_DB_NAME || "vmail",
      smtpHost: process.env.MAIL_SMTP_HOST || "127.0.0.1",
      smtpPort: parseInt(process.env.MAIL_SMTP_PORT || "465", 10),
      imapHost: process.env.MAIL_IMAP_HOST || "127.0.0.1",
      imapPort: parseInt(process.env.MAIL_IMAP_PORT || "993", 10),
      storageNode: process.env.IREDMAIL_STORAGE_NODE || "vmail1",
      ...config,
    };
  }

  /**
   * Helper to execute SQL against iRedMail vmail database.
   */
  private async query(sql: string, params: any[] = []): Promise<unknown[]> {
    if (this.config.dbType === "postgres") {
      const { Pool } = await import("pg");
      const pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });
      try {
        const res = await pool.query(sql, params);
        return res.rows;
      } finally {
        await pool.end();
      }
    } else {
      const mysql = await import("mysql2/promise");
      const connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });
      try {
        const [rows] = await connection.execute(sql, params as any);
        return rows as unknown[];
      } finally {
        await connection.end();
      }
    }
  }

  async createDomain(options: DomainProvisionOptions): Promise<void> {
    const domain = options.domain.toLowerCase();
    const maxQuota = options.maxQuotaMb || 0;
    const maxMailboxes = options.maxMailboxes || 0;

    const sql = `
      INSERT INTO domain (domain, description, disquota, maxquota, mailboxes, aliases, created, active, transport)
      VALUES (?, ?, 0, ?, ?, 100, NOW(), 1, 'dovecot')
      ON DUPLICATE KEY UPDATE active = 1, maxquota = VALUES(maxquota), mailboxes = VALUES(mailboxes)
    `;
    await this.query(sql, [domain, `Managed SaaS Domain: ${domain}`, maxQuota, maxMailboxes]);
  }

  async deleteDomain(domain: string): Promise<void> {
    const d = domain.toLowerCase();
    await this.query(`DELETE FROM forwardings WHERE domain = ?`, [d]);
    await this.query(`DELETE FROM alias WHERE domain = ?`, [d]);
    await this.query(`DELETE FROM mailbox WHERE domain = ?`, [d]);
    await this.query(`DELETE FROM domain WHERE domain = ?`, [d]);
  }

  async suspendDomain(domain: string): Promise<void> {
    await this.query(`UPDATE domain SET active = 0 WHERE domain = ?`, [domain.toLowerCase()]);
    await this.query(`UPDATE mailbox SET active = 0 WHERE domain = ?`, [domain.toLowerCase()]);
  }

  async activateDomain(domain: string): Promise<void> {
    await this.query(`UPDATE domain SET active = 1 WHERE domain = ?`, [domain.toLowerCase()]);
    await this.query(`UPDATE mailbox SET active = 1 WHERE domain = ?`, [domain.toLowerCase()]);
  }

  async getDomainUsage(domain: string): Promise<DomainUsage> {
    const d = domain.toLowerCase();
    const countRows = (await this.query(
      `SELECT COUNT(*) as count FROM mailbox WHERE domain = ? AND active = 1`,
      [d]
    )) as Array<{ count: number }>;
    const usageRows = (await this.query(
      `SELECT COALESCE(SUM(bytes), 0) as totalBytes FROM used_quota WHERE domain = ?`,
      [d]
    )) as Array<{ totalBytes: string | number }>;

    return {
      domain: d,
      mailboxCount: Number(countRows[0]?.count || 0),
      usedBytes: Number(usageRows[0]?.totalBytes || 0),
    };
  }

  async createMailbox(options: MailboxProvisionOptions): Promise<void> {
    const email = options.email.toLowerCase();
    const [user, domain] = email.split("@");
    if (!user || !domain) throw new Error("Invalid email format");

    // Maildir format according to iRedMail conventions
    const maildir = `${domain}/${user}/`;
    const dovecotHash = options.passwordHash.startsWith("{SSHA512}")
      ? options.passwordHash
      : hashDovecotPassword(options.passwordPlain);

    const sql = `
      INSERT INTO mailbox (
        username, password, name, maildir, quota, domain, created, active,
        enablesmtp, enablesmtpsecured, enablepop3, enablepop3secured, enableimap,
        enableimapsecured, enabledeliver, enablelda, enablemanagesieve,
        enablemanagesievesecured, enablesieve, enablesievesecured, enableinternal
      ) VALUES (
        ?, ?, ?, ?, ?, ?, NOW(), 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
      )
      ON DUPLICATE KEY UPDATE password = VALUES(password), quota = VALUES(quota), active = 1
    `;

    await this.query(sql, [
      email,
      dovecotHash,
      options.name || user,
      maildir,
      options.quotaMb,
      domain,
    ]);

    // Ensure self-forwarding entry in forwardings table (mandatory in iRedMail 0.9.7+ for local delivery)
    await this.query(
      `INSERT IGNORE INTO forwardings (address, forwarding, domain, dest_domain, is_forwarding, is_alias, is_list, active)
       VALUES (?, ?, ?, ?, 1, 0, 0, 1)`,
      [email, email, domain, domain]
    );
  }

  async updateMailbox(email: string, options: MailboxUpdateOptions): Promise<void> {
    const targetEmail = email.toLowerCase();
    const updates: string[] = [];
    const params: unknown[] = [];

    if (options.name !== undefined) {
      updates.push("name = ?");
      params.push(options.name);
    }
    if (options.quotaMb !== undefined) {
      updates.push("quota = ?");
      params.push(options.quotaMb);
    }
    if (options.active !== undefined) {
      updates.push("active = ?");
      params.push(options.active ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(targetEmail);
      await this.query(`UPDATE mailbox SET ${updates.join(", ")} WHERE username = ?`, params);
    }
  }

  async deleteMailbox(email: string): Promise<void> {
    const e = email.toLowerCase();
    await this.query(`DELETE FROM used_quota WHERE username = ?`, [e]);
    await this.query(`DELETE FROM forwardings WHERE address = ? OR forwarding = ?`, [e, e]);
    await this.query(`DELETE FROM alias WHERE address = ?`, [e]);
    await this.query(`DELETE FROM mailbox WHERE username = ?`, [e]);
  }

  async suspendMailbox(email: string): Promise<void> {
    const e = email.toLowerCase();
    await this.query(`UPDATE mailbox SET active = 0 WHERE username = ?`, [e]);
    await this.query(`UPDATE forwardings SET active = 0 WHERE address = ?`, [e]);
  }

  async activateMailbox(email: string): Promise<void> {
    const e = email.toLowerCase();
    await this.query(`UPDATE mailbox SET active = 1 WHERE username = ?`, [e]);
    await this.query(`UPDATE forwardings SET active = 1 WHERE address = ?`, [e]);
  }

  async changeMailboxPassword(email: string, newPasswordPlain: string, newPasswordHash: string): Promise<void> {
    const e = email.toLowerCase();
    const dovecotHash = newPasswordHash.startsWith("{SSHA512}")
      ? newPasswordHash
      : hashDovecotPassword(newPasswordPlain);
    await this.query(`UPDATE mailbox SET password = ? WHERE username = ?`, [dovecotHash, e]);
  }

  async getMailboxUsage(email: string): Promise<MailboxUsage> {
    const e = email.toLowerCase();
    const mbRows = (await this.query(`SELECT quota FROM mailbox WHERE username = ?`, [e])) as Array<{ quota: number }>;
    const quotaMb = mbRows[0]?.quota || 0;

    const usedRows = (await this.query(
      `SELECT bytes FROM used_quota WHERE username = ?`,
      [e]
    )) as Array<{ bytes: string | number }>;
    const usedBytes = Number(usedRows[0]?.bytes || 0);

    return {
      email: e,
      usedBytes,
      quotaBytes: quotaMb * 1024 * 1024,
    };
  }

  async createAlias(aliasAddress: string, destinationAddress: string): Promise<void> {
    const alias = aliasAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    const [, domain] = alias.split("@");
    const [, destDomain] = dest.split("@");

    // In iRedMail SQL, alias is inserted into alias table and forwardings table
    await this.query(
      `INSERT IGNORE INTO alias (address, domain, created, active) VALUES (?, ?, NOW(), 1)`,
      [alias, domain]
    );

    await this.query(
      `INSERT INTO forwardings (address, forwarding, domain, dest_domain, is_forwarding, is_alias, is_list, active)
       VALUES (?, ?, ?, ?, 0, 1, 0, 1)
       ON DUPLICATE KEY UPDATE active = 1`,
      [alias, dest, domain, destDomain]
    );
  }

  async deleteAlias(aliasAddress: string, destinationAddress: string): Promise<void> {
    const alias = aliasAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    await this.query(`DELETE FROM forwardings WHERE address = ? AND forwarding = ? AND is_alias = 1`, [alias, dest]);
    const remaining = (await this.query(`SELECT COUNT(*) as cnt FROM forwardings WHERE address = ?`, [alias])) as Array<{ cnt: number }>;
    if (Number(remaining[0]?.cnt || 0) === 0) {
      await this.query(`DELETE FROM alias WHERE address = ?`, [alias]);
    }
  }

  async createForwarder(sourceAddress: string, destinationAddress: string, keepLocalCopy: boolean): Promise<void> {
    const src = sourceAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    const [, domain] = src.split("@");
    const [, destDomain] = dest.split("@");

    await this.query(
      `INSERT INTO forwardings (address, forwarding, domain, dest_domain, is_forwarding, is_alias, is_list, active)
       VALUES (?, ?, ?, ?, 1, 0, 0, 1)
       ON DUPLICATE KEY UPDATE active = 1`,
      [src, dest, domain, destDomain]
    );

    if (keepLocalCopy) {
      // Ensure self forwarding exists
      await this.query(
        `INSERT IGNORE INTO forwardings (address, forwarding, domain, dest_domain, is_forwarding, is_alias, is_list, active)
         VALUES (?, ?, ?, ?, 1, 0, 0, 1)`,
        [src, src, domain, domain]
      );
    } else {
      // Remove self forwarding so mail is only forwarded externally
      await this.query(
        `DELETE FROM forwardings WHERE address = ? AND forwarding = ? AND is_forwarding = 1`,
        [src, src]
      );
    }
  }

  async deleteForwarder(sourceAddress: string, destinationAddress: string): Promise<void> {
    const src = sourceAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    await this.query(
      `DELETE FROM forwardings WHERE address = ? AND forwarding = ? AND is_forwarding = 1`,
      [src, dest]
    );
  }

  async getOrCreateDkimRecord(domain: string, selector: string = "default"): Promise<DkimKeyInfo> {
    // Generate RSA 2048 key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const strippedPublicKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\r?\n|\r/g, "");

    return {
      selector,
      publicKey: strippedPublicKey,
      privateKey,
      dnsTxtValue: `v=DKIM1; k=rsa; p=${strippedPublicKey}`,
    };
  }

  async checkServerHealth(): Promise<ServerHealthStatus> {
    const start = Date.now();
    let dbOk = false;
    let smtpOk = false;
    let imapOk = false;

    // 1. Check Database connection
    try {
      await this.query("SELECT 1 as health_check");
      dbOk = true;
    } catch {
      dbOk = false;
    }

    // 2. TCP ping SMTP host/port
    smtpOk = await this.pingPort(this.config.smtpHost || "127.0.0.1", this.config.smtpPort || 465);

    // 3. TCP ping IMAP host/port
    imapOk = await this.pingPort(this.config.imapHost || "127.0.0.1", this.config.imapPort || 993);

    const latencyMs = Date.now() - start;
    const online = dbOk && (smtpOk || imapOk);

    return {
      online,
      latencyMs,
      dbReachable: dbOk,
      smtpReachable: smtpOk,
      imapReachable: imapOk,
      message: online ? "All mail services operating normally" : "One or more infrastructure services unreachable",
    };
  }

  private pingPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, host);
    });
  }
}
