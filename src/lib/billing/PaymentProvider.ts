import { isProduction } from "@/lib/env/production";

export interface CheckoutParams {
  organizationId: string;
  planId: string;
  planName: string;
  amountCents: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  /** Required for AzamPay MNO checkout */
  phoneNumber?: string;
  /** Mobile money provider: Mpesa, Airtel, Tigo, Halopesa, Azampesa */
  mobileProvider?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface PaymentProvider {
  readonly providerName: string;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly providerName = "mock";

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const sessionId = `mock_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // Returns direct redirect to success URL for test simulation
    const checkoutUrl = `${params.successUrl}?session_id=${sessionId}&plan_id=${params.planId}`;
    return {
      checkoutUrl,
      sessionId,
    };
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // Mock cancellation
  }
}

export class StripePaymentProvider implements PaymentProvider {
  readonly providerName = "stripe";
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.STRIPE_SECRET_KEY || "";
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    if (!this.secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    // Minimal standard Stripe Checkout Session invocation
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        mode: "subscription",
        "client_reference_id": params.organizationId,
        "line_items[0][price_data][currency]": params.currency || "usd",
        "line_items[0][price_data][product_data][name]": `${params.planName} Plan`,
        "line_items[0][price_data][unit_amount]": String(params.amountCents),
        "line_items[0][price_data][recurring][interval]": "month",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Stripe API error: ${err}`);
    }

    const data = (await response.json()) as { url: string; id: string };
    return {
      checkoutUrl: data.url,
      sessionId: data.id,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    if (!this.secretKey) return;
    await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });
  }
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  try {
    const { prisma } = await import("@/lib/db/prisma");
    const settings = await prisma.systemSetting.findMany({
      where: { category: "BILLING" },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));

    const provider = map.get("PAYMENT_PROVIDER") || process.env.PAYMENT_PROVIDER || "azampay";

    if (provider === "stripe") {
      const secretKey = map.get("STRIPE_SECRET_KEY") || process.env.STRIPE_SECRET_KEY;
      if (secretKey) {
        return new StripePaymentProvider(secretKey);
      }
    }

    if (provider === "azampay") {
      const { AzamPayPaymentProvider } = await import("./AzamPayProvider");
      const env = map.get("AZAMPAY_ENV") || (process.env.AZAMPAY_BASE_URL?.includes("sandbox") ? "sandbox" : "sandbox");
      const isSandbox = env === "sandbox";

      return new AzamPayPaymentProvider({
        appName: map.get("AZAMPAY_APP_NAME") || process.env.AZAMPAY_APP_NAME,
        clientId: map.get("AZAMPAY_CLIENT_ID") || process.env.AZAMPAY_CLIENT_ID,
        clientSecret: map.get("AZAMPAY_CLIENT_SECRET") || process.env.AZAMPAY_CLIENT_SECRET,
        apiKey: map.get("AZAMPAY_API_KEY") || process.env.AZAMPAY_API_KEY,
        baseUrl: map.get("AZAMPAY_BASE_URL") || (isSandbox ? "https://sandbox.azampay.co.tz" : "https://api.azampay.co.tz"),
        authUrl: map.get("AZAMPAY_AUTH_URL") || (isSandbox ? "https://authenticator-sandbox.azampay.co.tz" : "https://authenticator.azampay.co.tz"),
        callbackUrl: map.get("AZAMPAY_CALLBACK_URL") || process.env.AZAMPAY_CALLBACK_URL,
        usdToTzsRate: Number(map.get("AZAMPAY_USD_TO_TZS_RATE")) || Number(process.env.AZAMPAY_USD_TO_TZS_RATE) || 2700,
        simulate: map.get("AZAMPAY_SIMULATE") === "true" || process.env.AZAMPAY_SIMULATE === "true",
      });
    }

    if (provider === "mock") {
      if (isProduction()) {
        throw new Error("Mock payment provider is disabled in production.");
      }
      return new MockPaymentProvider();
    }
  } catch (err) {
    console.warn("Could not load dynamic payment provider settings from DB, falling back to env:", err);
  }

  // Fallback to process.env
  const envProvider = process.env.PAYMENT_PROVIDER;
  if (envProvider === "stripe" && process.env.STRIPE_SECRET_KEY) {
    return new StripePaymentProvider();
  }
  if (envProvider === "azampay") {
    const { AzamPayPaymentProvider } = require("./AzamPayProvider");
    return new AzamPayPaymentProvider();
  }

  if (isProduction()) {
    throw new Error("PAYMENT_PROVIDER must be stripe or azampay in production.");
  }

  return new MockPaymentProvider();
}
