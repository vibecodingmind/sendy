export interface DomainProvisionOptions {
  domain: string;
  maxQuotaMb?: number;
  maxMailboxes?: number;
}

export interface MailboxProvisionOptions {
  email: string;
  name?: string;
  passwordPlain: string;
  passwordHash: string;
  quotaMb: number;
}

export interface MailboxUpdateOptions {
  name?: string;
  quotaMb?: number;
  active?: boolean;
}

export interface MailboxUsage {
  email: string;
  usedBytes: number;
  quotaBytes: number;
}

export interface DomainUsage {
  domain: string;
  mailboxCount: number;
  usedBytes: number;
}

export interface DkimKeyInfo {
  selector: string;
  publicKey: string;
  privateKey?: string;
  dnsTxtValue: string;
}

export interface ServerHealthStatus {
  online: boolean;
  latencyMs: number;
  smtpReachable: boolean;
  imapReachable: boolean;
  dbReachable: boolean;
  details?: Record<string, unknown>;
  message?: string;
}

export interface MailProvider {
  readonly providerName: string;

  // Domain Management
  createDomain(options: DomainProvisionOptions): Promise<void>;
  deleteDomain(domain: string): Promise<void>;
  suspendDomain(domain: string): Promise<void>;
  activateDomain(domain: string): Promise<void>;
  getDomainUsage(domain: string): Promise<DomainUsage>;

  // Mailbox Management
  createMailbox(options: MailboxProvisionOptions): Promise<void>;
  updateMailbox(email: string, options: MailboxUpdateOptions): Promise<void>;
  deleteMailbox(email: string): Promise<void>;
  suspendMailbox(email: string): Promise<void>;
  activateMailbox(email: string): Promise<void>;
  changeMailboxPassword(email: string, newPasswordPlain: string, newPasswordHash: string): Promise<void>;
  getMailboxUsage(email: string): Promise<MailboxUsage>;

  // Aliases & Forwarders
  createAlias(aliasAddress: string, destinationAddress: string): Promise<void>;
  deleteAlias(aliasAddress: string, destinationAddress: string): Promise<void>;
  createForwarder(sourceAddress: string, destinationAddress: string, keepLocalCopy: boolean): Promise<void>;
  deleteForwarder(sourceAddress: string, destinationAddress: string): Promise<void>;

  // Security & Health
  getOrCreateDkimRecord(domain: string, selector?: string): Promise<DkimKeyInfo>;
  checkServerHealth(): Promise<ServerHealthStatus>;
}
