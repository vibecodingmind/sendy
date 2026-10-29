import {
  DomainRegistrarProvider,
  DomainAvailability,
  RegisterDomainParams,
  DomainRegistrationResult,
  TransferDomainParams,
  DomainTransferResult,
  DomainRegistrarConfig,
} from "./DomainRegistrar";

const DEFAULT_TLDS: Record<string, number> = {
  com: 1299, // $12.99
  net: 1499, // $14.99
  org: 1399, // $13.99
  io: 3999,  // $39.99
  co: 2499,  // $24.99
  "co.tz": 2200, // $22.00
  tz: 2900,  // $29.00
  email: 1999, // $19.99
  biz: 1199, // $11.99
  info: 1099, // $10.99
};

export class MockRegistrarProvider implements DomainRegistrarProvider {
  readonly name = "Mock Registrar";
  private config: DomainRegistrarConfig;

  constructor(config: DomainRegistrarConfig) {
    this.config = config;
  }

  async checkAvailability(rawQuery: string, requestedTlds?: string[]): Promise<DomainAvailability[]> {
    const clean = rawQuery.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    
    // Split domain stem and possible extension
    const parts = clean.split(".");
    const stem = parts[0];
    const explicitTld = parts.length > 1 ? parts.slice(1).join(".") : null;

    const tldList = explicitTld ? [explicitTld] : (requestedTlds && requestedTlds.length > 0 ? requestedTlds : ["com", "net", "org", "co.tz", "io", "email"]);

    const takenKeywords = ["google", "apple", "microsoft", "amazon", "facebook", "meta", "tesla", "taken", "mailoo"];

    const results: DomainAvailability[] = [];

    for (const tld of tldList) {
      const fullDomain = `${stem}.${tld}`;
      const priceCents = DEFAULT_TLDS[tld] || 1599;

      // Realistic mock availability logic
      const isTaken = takenKeywords.some((kw) => stem === kw) || stem.length <= 3;

      results.push({
        domain: fullDomain,
        tld: `.${tld}`,
        available: !isTaken,
        priceYearCents: priceCents,
        currency: this.config.defaultCurrency || "USD",
        periodYears: 1,
        isPremium: stem.length <= 4 && !isTaken,
      });
    }

    return results;
  }

  async registerDomain(params: RegisterDomainParams): Promise<DomainRegistrationResult> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + (params.years || 1));

    const nameservers = params.nameservers && params.nameservers.length > 0
      ? params.nameservers
      : [
          this.config.nameserver1 || "ns1.monogrammail.com",
          this.config.nameserver2 || "ns2.monogrammail.com",
        ];

    return {
      success: true,
      domain: params.domain.toLowerCase(),
      orderId: `REG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      expiresAt,
      nameservers,
      message: `Domain ${params.domain} successfully registered for ${params.years || 1} year(s) with automated nameservers.`,
      rawResponse: { provider: "mock", simulatedAt: new Date().toISOString() },
    };
  }

  async transferDomain(params: TransferDomainParams): Promise<DomainTransferResult> {
    if (!params.authCode || params.authCode.trim().length < 4) {
      return {
        success: false,
        domain: params.domain,
        transferId: "",
        status: "FAILED",
        message: "Invalid or missing EPP Authorization/Auth code.",
      };
    }

    return {
      success: true,
      domain: params.domain.toLowerCase(),
      transferId: `XFER-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: "COMPLETED",
      message: `Domain transfer initiated for ${params.domain}. Nameservers automatically scheduled to ${this.config.nameserver1 || "ns1.monogrammail.com"}.`,
      rawResponse: { provider: "mock", simulatedAt: new Date().toISOString() },
    };
  }

  async setNameservers(domain: string, nameservers: string[]): Promise<boolean> {
    console.log(`[MockRegistrarProvider] Updated nameservers for ${domain} to:`, nameservers);
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; accountBalance?: string }> {
    return {
      success: true,
      message: "Mock Registrar Provider is active and simulating live operations.",
      accountBalance: "$1,500.00 USD (Simulated)",
    };
  }
}
