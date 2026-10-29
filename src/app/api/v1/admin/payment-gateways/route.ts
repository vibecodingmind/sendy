import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    await requireSuperAdmin();

    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: "BILLING" },
    });
    const map = new Map(dbSettings.map((s) => [s.key, s.value]));

    const azamEnv = map.get("AZAMPAY_ENV") || (process.env.AZAMPAY_BASE_URL?.includes("sandbox") ? "sandbox" : "sandbox");
    const isSandbox = azamEnv === "sandbox";

    const azamSecret = map.get("AZAMPAY_CLIENT_SECRET") || process.env.AZAMPAY_CLIENT_SECRET || "";
    const azamKey = map.get("AZAMPAY_API_KEY") || process.env.AZAMPAY_API_KEY || "";
    const stripeSecret = map.get("STRIPE_SECRET_KEY") || process.env.STRIPE_SECRET_KEY || "";
    const stripeWebhook = map.get("STRIPE_WEBHOOK_SECRET") || process.env.STRIPE_WEBHOOK_SECRET || "";

    const mask = (val: string) => {
      if (!val) return "";
      if (val.length <= 8) return "••••••••";
      return `••••••••${val.slice(-4)}`;
    };

    const settings = {
      activeProvider: map.get("PAYMENT_PROVIDER") || process.env.PAYMENT_PROVIDER || "azampay",
      azampay: {
        appName: map.get("AZAMPAY_APP_NAME") || process.env.AZAMPAY_APP_NAME || "UltimateSMS",
        clientId: map.get("AZAMPAY_CLIENT_ID") || process.env.AZAMPAY_CLIENT_ID || "",
        clientSecret: mask(azamSecret),
        hasClientSecret: Boolean(azamSecret),
        apiKey: mask(azamKey),
        hasApiKey: Boolean(azamKey),
        environment: azamEnv,
        baseUrl: map.get("AZAMPAY_BASE_URL") || (isSandbox ? "https://sandbox.azampay.co.tz" : "https://api.azampay.co.tz"),
        authUrl: map.get("AZAMPAY_AUTH_URL") || (isSandbox ? "https://authenticator-sandbox.azampay.co.tz" : "https://authenticator.azampay.co.tz"),
        callbackUrl: map.get("AZAMPAY_CALLBACK_URL") || process.env.AZAMPAY_CALLBACK_URL || "/api/v1/billing/webhook/azampay",
        usdToTzsRate: Number(map.get("AZAMPAY_USD_TO_TZS_RATE")) || Number(process.env.AZAMPAY_USD_TO_TZS_RATE) || 2700,
        simulate: map.get("AZAMPAY_SIMULATE") === "true" || process.env.AZAMPAY_SIMULATE === "true",
      },
      stripe: {
        publishableKey: map.get("STRIPE_PUBLISHABLE_KEY") || process.env.STRIPE_PUBLISHABLE_KEY || "",
        secretKey: mask(stripeSecret),
        hasSecretKey: Boolean(stripeSecret),
        webhookSecret: mask(stripeWebhook),
        hasWebhookSecret: Boolean(stripeWebhook),
        currency: map.get("STRIPE_CURRENCY") || process.env.STRIPE_CURRENCY || "USD",
      },
    };

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();

    const { activeProvider, azampay, stripe } = body;

    const upsertSetting = async (key: string, value: string) => {
      await prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value,
          category: "BILLING",
        },
        update: {
          value,
        },
      });
    };

    if (activeProvider) {
      await upsertSetting("PAYMENT_PROVIDER", activeProvider);
    }

    if (azampay) {
      if (azampay.appName !== undefined) await upsertSetting("AZAMPAY_APP_NAME", azampay.appName);
      if (azampay.clientId !== undefined) await upsertSetting("AZAMPAY_CLIENT_ID", azampay.clientId);
      if (azampay.clientSecret && !azampay.clientSecret.startsWith("••••")) {
        await upsertSetting("AZAMPAY_CLIENT_SECRET", azampay.clientSecret);
      }
      if (azampay.apiKey && !azampay.apiKey.startsWith("••••")) {
        await upsertSetting("AZAMPAY_API_KEY", azampay.apiKey);
      }
      if (azampay.environment) {
        await upsertSetting("AZAMPAY_ENV", azampay.environment);
        const isSandbox = azampay.environment === "sandbox";
        await upsertSetting("AZAMPAY_BASE_URL", isSandbox ? "https://sandbox.azampay.co.tz" : "https://api.azampay.co.tz");
        await upsertSetting("AZAMPAY_AUTH_URL", isSandbox ? "https://authenticator-sandbox.azampay.co.tz" : "https://authenticator.azampay.co.tz");
      }
      if (azampay.baseUrl) await upsertSetting("AZAMPAY_BASE_URL", azampay.baseUrl);
      if (azampay.authUrl) await upsertSetting("AZAMPAY_AUTH_URL", azampay.authUrl);
      if (azampay.callbackUrl !== undefined) await upsertSetting("AZAMPAY_CALLBACK_URL", azampay.callbackUrl);
      if (azampay.usdToTzsRate !== undefined) await upsertSetting("AZAMPAY_USD_TO_TZS_RATE", String(azampay.usdToTzsRate));
      if (azampay.simulate !== undefined) await upsertSetting("AZAMPAY_SIMULATE", String(azampay.simulate));
    }

    if (stripe) {
      if (stripe.publishableKey !== undefined) await upsertSetting("STRIPE_PUBLISHABLE_KEY", stripe.publishableKey);
      if (stripe.secretKey && !stripe.secretKey.startsWith("••••")) {
        await upsertSetting("STRIPE_SECRET_KEY", stripe.secretKey);
      }
      if (stripe.webhookSecret && !stripe.webhookSecret.startsWith("••••")) {
        await upsertSetting("STRIPE_WEBHOOK_SECRET", stripe.webhookSecret);
      }
      if (stripe.currency !== undefined) await upsertSetting("STRIPE_CURRENCY", stripe.currency);
    }

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: "PAYMENT_GATEWAYS_UPDATED",
      resourceType: "SystemSetting",
      metadata: { activeProvider, environment: azampay?.environment },
    });

    return NextResponse.json({ message: "Payment gateway settings successfully updated." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
