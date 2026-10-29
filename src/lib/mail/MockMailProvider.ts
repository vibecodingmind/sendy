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
import crypto from "crypto";

export class MockMailProvider implements MailProvider {
  readonly providerName = "mock";

  private domains: Map<string, { active: boolean; maxQuotaMb: number; maxMailboxes: number }> = new Map();
  private mailboxes: Map<string, { name: string; passwordHash: string; quotaMb: number; active: boolean; usedBytes: number }> = new Map();
  private aliases: Map<string, Set<string>> = new Map();
  private forwarders: Map<string, Set<{ dest: string; keepLocal: boolean }>> = new Map();
  private dkimKeys: Map<string, DkimKeyInfo> = new Map();

  async createDomain(options: DomainProvisionOptions): Promise<void> {
    const domain = options.domain.toLowerCase();
    this.domains.set(domain, {
      active: true,
      maxQuotaMb: options.maxQuotaMb || 0,
      maxMailboxes: options.maxMailboxes || 0,
    });
  }

  async deleteDomain(domain: string): Promise<void> {
    this.domains.delete(domain.toLowerCase());
  }

  async suspendDomain(domain: string): Promise<void> {
    const d = this.domains.get(domain.toLowerCase());
    if (d) d.active = false;
  }

  async activateDomain(domain: string): Promise<void> {
    const d = this.domains.get(domain.toLowerCase());
    if (d) d.active = true;
  }

  async getDomainUsage(domain: string): Promise<DomainUsage> {
    const d = domain.toLowerCase();
    let mailboxCount = 0;
    let usedBytes = 0;
    for (const [email, mb] of this.mailboxes.entries()) {
      if (email.endsWith(`@${d}`)) {
        mailboxCount++;
        usedBytes += mb.usedBytes;
      }
    }
    return { domain: d, mailboxCount, usedBytes };
  }

  async createMailbox(options: MailboxProvisionOptions): Promise<void> {
    const email = options.email.toLowerCase();
    this.mailboxes.set(email, {
      name: options.name || "",
      passwordHash: options.passwordHash,
      quotaMb: options.quotaMb,
      active: true,
      usedBytes: 1024 * 1024 * 5, // 5MB simulated welcome email storage
    });
  }

  async updateMailbox(email: string, options: MailboxUpdateOptions): Promise<void> {
    const mb = this.mailboxes.get(email.toLowerCase());
    if (mb) {
      if (options.name !== undefined) mb.name = options.name;
      if (options.quotaMb !== undefined) mb.quotaMb = options.quotaMb;
      if (options.active !== undefined) mb.active = options.active;
    }
  }

  async deleteMailbox(email: string): Promise<void> {
    this.mailboxes.delete(email.toLowerCase());
  }

  async suspendMailbox(email: string): Promise<void> {
    const mb = this.mailboxes.get(email.toLowerCase());
    if (mb) mb.active = false;
  }

  async activateMailbox(email: string): Promise<void> {
    const mb = this.mailboxes.get(email.toLowerCase());
    if (mb) mb.active = true;
  }

  async changeMailboxPassword(email: string, _newPasswordPlain: string, newPasswordHash: string): Promise<void> {
    const mb = this.mailboxes.get(email.toLowerCase());
    if (mb) mb.passwordHash = newPasswordHash;
  }

  async getMailboxUsage(email: string): Promise<MailboxUsage> {
    const mb = this.mailboxes.get(email.toLowerCase());
    if (!mb) {
      return { email: email.toLowerCase(), usedBytes: 0, quotaBytes: 0 };
    }
    return {
      email: email.toLowerCase(),
      usedBytes: mb.usedBytes,
      quotaBytes: mb.quotaMb * 1024 * 1024,
    };
  }

  async createAlias(aliasAddress: string, destinationAddress: string): Promise<void> {
    const alias = aliasAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    if (!this.aliases.has(alias)) {
      this.aliases.set(alias, new Set());
    }
    this.aliases.get(alias)!.add(dest);
  }

  async deleteAlias(aliasAddress: string, destinationAddress: string): Promise<void> {
    const alias = aliasAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    const set = this.aliases.get(alias);
    if (set) {
      set.delete(dest);
    }
  }

  async createForwarder(sourceAddress: string, destinationAddress: string, keepLocalCopy: boolean): Promise<void> {
    const src = sourceAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    if (!this.forwarders.has(src)) {
      this.forwarders.set(src, new Set());
    }
    this.forwarders.get(src)!.add({ dest, keepLocal: keepLocalCopy });
  }

  async deleteForwarder(sourceAddress: string, destinationAddress: string): Promise<void> {
    const src = sourceAddress.toLowerCase();
    const dest = destinationAddress.toLowerCase();
    const set = this.forwarders.get(src);
    if (set) {
      for (const item of Array.from(set)) {
        if (item.dest === dest) set.delete(item);
      }
    }
  }

  async getOrCreateDkimRecord(domain: string, selector: string = "default"): Promise<DkimKeyInfo> {
    const key = `${domain.toLowerCase()}:${selector}`;
    if (this.dkimKeys.has(key)) {
      return this.dkimKeys.get(key)!;
    }

    // Generate real RSA key pair for testing verification
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 1024,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const strippedPublicKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\r?\n|\r/g, "");

    const info: DkimKeyInfo = {
      selector,
      publicKey: strippedPublicKey,
      privateKey,
      dnsTxtValue: `v=DKIM1; k=rsa; p=${strippedPublicKey}`,
    };

    this.dkimKeys.set(key, info);
    return info;
  }

  async checkServerHealth(): Promise<ServerHealthStatus> {
    return {
      online: true,
      latencyMs: 12,
      smtpReachable: true,
      imapReachable: true,
      dbReachable: true,
      details: {
        totalDomains: this.domains.size,
        totalMailboxes: this.mailboxes.size,
      },
    };
  }
}
