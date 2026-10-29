/**
 * AzamPay Payment Provider
 *
 * Integrates with AzamPay's MNO Checkout API for mobile money payments
 * in East Africa (M-Pesa, Airtel Money, Tigo Pesa, Halopesa, AzamPesa).
 *
 * Flow:
 *  1. Authenticate → get Bearer JWT token
 *  2. POST MNO checkout → triggers USSD push to customer's phone
 *  3. Customer confirms on phone → AzamPay sends callback to our webhook
 *
 * Docs: https://developerdocs.azampay.co.tz
 */

import type { PaymentProvider, CheckoutParams, CheckoutResult } from "./PaymentProvider";

interface AzamPayConfig {
  appName: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  baseUrl: string;
  authUrl: string;
  callbackUrl: string;
  usdToTzsRate?: number;
  simulate?: boolean;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

// Default USD → TZS conversion rate (can be overridden via env)
const DEFAULT_USD_TO_TZS_RATE = 2700;

export class AzamPayPaymentProvider implements PaymentProvider {
  readonly providerName = "azampay";
  private config: AzamPayConfig;
  private cachedToken: CachedToken | null = null;

  constructor(customConfig?: Partial<AzamPayConfig>) {
    this.config = {
      appName: customConfig?.appName || process.env.AZAMPAY_APP_NAME || "",
      clientId: customConfig?.clientId || process.env.AZAMPAY_CLIENT_ID || "",
      clientSecret: customConfig?.clientSecret || process.env.AZAMPAY_CLIENT_SECRET || "",
      apiKey: customConfig?.apiKey || process.env.AZAMPAY_API_KEY || "",
      baseUrl: customConfig?.baseUrl || process.env.AZAMPAY_BASE_URL || "https://sandbox.azampay.co.tz",
      authUrl: customConfig?.authUrl || process.env.AZAMPAY_AUTH_URL || "https://authenticator-sandbox.azampay.co.tz",
      callbackUrl: customConfig?.callbackUrl || process.env.AZAMPAY_CALLBACK_URL || "",
      usdToTzsRate: customConfig?.usdToTzsRate || Number(process.env.AZAMPAY_USD_TO_TZS_RATE) || DEFAULT_USD_TO_TZS_RATE,
      simulate: customConfig?.simulate !== undefined ? customConfig.simulate : process.env.AZAMPAY_SIMULATE === "true",
    };
  }

  /**
   * Authenticate with AzamPay and get a Bearer JWT token.
   * Tokens are cached until 5 minutes before expiry.
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 min buffer)
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 5 * 60 * 1000) {
      return this.cachedToken.token;
    }

    const response = await fetch(
      `${this.config.authUrl}/AppRegistration/GenerateToken`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: this.config.appName,
          clientId: this.config.clientId,
          clientSecret: this.config.clientSecret,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AzamPay auth failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const token = data.data?.accessToken || data.accessToken;

    if (!token) {
      throw new Error("AzamPay auth response missing access token");
    }

    // Cache token for 50 minutes (tokens typically last 1 hour)
    this.cachedToken = {
      token,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };

    return token;
  }

  /**
   * Convert USD cents to TZS amount.
   */
  private convertToTzs(amountCents: number): string {
    const rate = Number(process.env.AZAMPAY_USD_TO_TZS_RATE) || DEFAULT_USD_TO_TZS_RATE;
    const amountUsd = amountCents / 100;
    const amountTzs = Math.round(amountUsd * rate);
    return String(amountTzs);
  }

  /**
   * Initiate an MNO checkout (mobile money push payment).
   *
   * This sends a USSD push to the customer's phone. The customer
   * confirms with their PIN, and AzamPay sends the result to our
   * webhook callback URL.
   */
  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    if (!params.phoneNumber) {
      throw new Error("Phone number is required for AzamPay MNO checkout");
    }

    const provider = params.mobileProvider || "Mpesa";
    const externalId = `MM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const amountTzs = this.convertToTzs(params.amountCents);

    // Clean phone number: ensure it starts with 255 (Tanzania country code)
    let phoneNumber = params.phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (phoneNumber.startsWith("+")) {
      phoneNumber = phoneNumber.slice(1);
    }
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "255" + phoneNumber.slice(1);
    }
    if (!phoneNumber.startsWith("255")) {
      phoneNumber = "255" + phoneNumber;
    }

    const isSimulate =
      process.env.NODE_ENV !== "production" &&
      (this.config.simulate ||
        process.env.AZAMPAY_SIMULATE === "true" ||
        (!this.config.clientId && !this.config.clientSecret));

    // If simulating in dev without real credentials, return pending & trigger callback
    if (isSimulate && (!this.config.clientId || !this.config.clientSecret)) {
      console.log(
        `[AzamPay Simulation] MNO checkout for ${phoneNumber} (${provider}), amount: TZS ${amountTzs}`
      );

      const appUrl = process.env.APP_URL || "http://localhost:3010";
      setTimeout(async () => {
        try {
          const webhookHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const webhookSecret = process.env.AZAMPAY_WEBHOOK_SECRET?.trim();
          if (webhookSecret) {
            webhookHeaders["x-webhook-secret"] = webhookSecret;
          }

          await fetch(`${appUrl}/api/v1/billing/webhook/azampay`, {
            method: "POST",
            headers: webhookHeaders,
            body: JSON.stringify({
              transactionstatus: "success",
              transactionId: `sim_tx_${Date.now()}`,
              externalId,
              amount: amountTzs,
              operator: provider,
              msisdn: phoneNumber,
              additionalProperties: {
                organizationId: params.organizationId,
                planId: params.planId,
                planName: params.planName,
                amountCents: params.amountCents,
              },
            }),
          });
        } catch (simErr) {
          console.error("[AzamPay Simulation] Callback error:", simErr);
        }
      }, 3500);

      return {
        checkoutUrl: `${params.successUrl}?provider=azampay&status=pending&ref=${externalId}`,
        sessionId: `sim_${externalId}`,
      };
    }

    if (!this.config.appName || !this.config.clientId || !this.config.clientSecret) {
      throw new Error(
        "AzamPay credentials not configured. Set AZAMPAY_APP_NAME, AZAMPAY_CLIENT_ID, and AZAMPAY_CLIENT_SECRET in your .env file."
      );
    }

    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.baseUrl}/azampay/mno/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-API-KEY": this.config.apiKey,
      },
      body: JSON.stringify({
        accountNumber: phoneNumber,
        amount: amountTzs,
        currency: "TZS",
        externalId,
        provider,
        additionalProperties: {
          organizationId: params.organizationId,
          planId: params.planId,
          planName: params.planName,
          amountCents: params.amountCents,
          callbackUrl: this.config.callbackUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AzamPay MNO checkout failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // AzamPay MNO checkout is push-based (no redirect URL).
    // The customer will receive a USSD prompt on their phone.
    // We return a "pending" status with the transaction reference.
    return {
      checkoutUrl: `${params.successUrl}?provider=azampay&status=pending&ref=${externalId}`,
      sessionId: data.transactionId || externalId,
    };
  }

  /**
   * AzamPay doesn't have subscription management — we handle it locally.
   */
  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // No-op: AzamPay is a one-time payment gateway, not a subscription manager.
    // Subscription lifecycle is managed by our own billing system.
  }
}
