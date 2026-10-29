import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = await req.json();
    const { provider, azampay, stripe } = body;

    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: "BILLING" },
    });
    const map = new Map(dbSettings.map((s) => [s.key, s.value]));

    if (provider === "azampay") {
      const appName = azampay?.appName || map.get("AZAMPAY_APP_NAME") || process.env.AZAMPAY_APP_NAME || "";
      const clientId = azampay?.clientId || map.get("AZAMPAY_CLIENT_ID") || process.env.AZAMPAY_CLIENT_ID || "";
      let clientSecret = azampay?.clientSecret;
      if (!clientSecret || clientSecret.startsWith("••••")) {
        clientSecret = map.get("AZAMPAY_CLIENT_SECRET") || process.env.AZAMPAY_CLIENT_SECRET || "";
      }

      const env = azampay?.environment || map.get("AZAMPAY_ENV") || "sandbox";
      const authUrl = azampay?.authUrl || map.get("AZAMPAY_AUTH_URL") ||
        (env === "sandbox" ? "https://authenticator-sandbox.azampay.co.tz" : "https://authenticator.azampay.co.tz");

      if (!appName || !clientId || !clientSecret) {
        return NextResponse.json(
          { success: false, error: "Missing required AzamPay credentials (appName, clientId, clientSecret)." },
          { status: 400 }
        );
      }

      const tokenEndpoint = `${authUrl.replace(/\/+$/, "")}/AppRegistration/GenerateToken`;

      try {
        const response = await fetch(tokenEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            appName,
            clientId,
            clientSecret,
          }),
        });

        const data = await response.json();

        if (response.ok && data?.data?.accessToken) {
          return NextResponse.json({
            success: true,
            message: `AzamPay authentication succeeded! Generated bearer token (expires in ${data.data.expire || '60m'}).`,
            details: {
              environment: env,
              endpoint: tokenEndpoint,
              appName,
              clientIdMasked: `${clientId.slice(0, 8)}...`,
            },
          });
        }

        return NextResponse.json({
          success: false,
          error: data?.message || data?.errors || "Failed to authenticate with AzamPay. Please check client ID and secret.",
          statusCode: response.status,
        });
      } catch (networkErr: unknown) {
        const err = networkErr as Error;
        return NextResponse.json({
          success: false,
          error: `Network error connecting to AzamPay (${tokenEndpoint}): ${err.message}`,
        });
      }
    }

    if (provider === "stripe") {
      let secretKey = stripe?.secretKey;
      if (!secretKey || secretKey.startsWith("••••")) {
        secretKey = map.get("STRIPE_SECRET_KEY") || process.env.STRIPE_SECRET_KEY || "";
      }

      if (!secretKey) {
        return NextResponse.json(
          { success: false, error: "Missing Stripe Secret Key." },
          { status: 400 }
        );
      }

      try {
        const response = await fetch("https://api.stripe.com/v1/balance", {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            success: true,
            message: "Stripe connection verified successfully!",
            details: {
              livemode: data.livemode,
              availableCurrencies: data.available?.map((b: any) => b.currency.toUpperCase()) || [],
            },
          });
        }

        const errData = await response.json();
        return NextResponse.json({
          success: false,
          error: errData?.error?.message || "Invalid Stripe API key.",
          statusCode: response.status,
        });
      } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({
          success: false,
          error: `Network error connecting to Stripe: ${error.message}`,
        });
      }
    }

    return NextResponse.json({ success: true, message: `Mock simulation provider is always ready.` });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
