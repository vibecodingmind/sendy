import { prisma } from "@/lib/db/prisma";

export interface DomainAvailability {
  domain: string;
  tld: string;
  available: boolean;
  priceYearCents: number;
  currency: string;
  periodYears: number;
  isPremium?: boolean;
}

export interface RegisterDomainParams {
  domain: string;
  years: number;
  contact?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    organization?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  nameservers?: string[];
}

export interface DomainRegistrationResult {
  success: boolean;
  domain: string;
  orderId: string;
  expiresAt: Date;
  nameservers: string[];
  message?: string;
  rawResponse?: any;
}

export interface TransferDomainParams {
  domain: string;
  authCode: string; // EPP code
  nameservers?: string[];
}

export interface DomainTransferResult {
  success: boolean;
  domain: string;
  transferId: string;
  status: "INITIATED" | "PENDING_APPROVAL" | "COMPLETED" | "FAILED";
  message: string;
  rawResponse?: any;
}

export interface DomainRegistrarConfig {
  provider: string; // "mock", "namecheap", "resellerclub", "godaddy", "custom"
  apiKey?: string;
  apiSecret?: string;
  apiUser?: string;
  environment?: "sandbox" | "production";
  baseUrl?: string;
  nameserver1?: string;
  nameserver2?: string;
  defaultCurrency?: string;
}

export interface DomainRegistrarProvider {
  readonly name: string;
  checkAvailability(domain: string, tlds?: string[]): Promise<DomainAvailability[]>;
  registerDomain(params: RegisterDomainParams): Promise<DomainRegistrationResult>;
  transferDomain(params: TransferDomainParams): Promise<DomainTransferResult>;
  setNameservers(domain: string, nameservers: string[]): Promise<boolean>;
  testConnection(): Promise<{ success: boolean; message: string; accountBalance?: string }>;
}

/**
 * Retrieves the currently active Domain Registrar provider, dynamically loaded
 * from the SystemSetting database table with fallback to environment variables.
 */
export async function getDomainRegistrarProvider(): Promise<DomainRegistrarProvider> {
  const { MockRegistrarProvider } = await import("./MockRegistrarProvider");
  const { GenericRegistrarProvider } = await import("./GenericRegistrarProvider");

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { category: "REGISTRAR" },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));

    const providerType =
      map.get("REGISTRAR_PROVIDER") || process.env.REGISTRAR_PROVIDER || "mock";

    const config: DomainRegistrarConfig = {
      provider: providerType,
      apiKey: map.get("REGISTRAR_API_KEY") || process.env.REGISTRAR_API_KEY || "",
      apiSecret: map.get("REGISTRAR_API_SECRET") || process.env.REGISTRAR_API_SECRET || "",
      apiUser: map.get("REGISTRAR_API_USER") || process.env.REGISTRAR_API_USER || "",
      environment: (map.get("REGISTRAR_ENV") || process.env.REGISTRAR_ENV || "sandbox") as "sandbox" | "production",
      baseUrl: map.get("REGISTRAR_BASE_URL") || process.env.REGISTRAR_BASE_URL,
      nameserver1: map.get("DNS_NAMESERVER_1") || process.env.MAIL_NS1 || "ns1.monogrammail.com",
      nameserver2: map.get("DNS_NAMESERVER_2") || process.env.MAIL_NS2 || "ns2.monogrammail.com",
      defaultCurrency: map.get("REGISTRAR_CURRENCY") || "USD",
    };

    if (providerType === "mock") {
      return new MockRegistrarProvider(config);
    }

    return new GenericRegistrarProvider(config);
  } catch (err) {
    console.error("[REGISTRAR_INIT_ERROR] Falling back to MockRegistrarProvider:", err);
    return new MockRegistrarProvider({
      provider: "mock",
      nameserver1: "ns1.monogrammail.com",
      nameserver2: "ns2.monogrammail.com",
    });
  }
}
