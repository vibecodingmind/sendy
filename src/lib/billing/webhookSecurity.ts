import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isProduction } from "@/lib/env/production";

export function verifyAzamPayWebhook(request: NextRequest): boolean {
  const secret = process.env.AZAMPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return !isProduction();
  }

  const headerSecret =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("x-azampay-signature") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (headerSecret && headerSecret === secret) {
    return true;
  }

  return false;
}

/** Internal dev simulation only — must not be used without shared secret. */
export function verifyAzamPaySimulationHeader(request: NextRequest): boolean {
  const secret = process.env.AZAMPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return request.headers.get("x-mailoo-webhook-secret") === secret;
}

export function verifyStripeWebhookSignature(rawBody: string, signature: string | null): boolean {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return !isProduction();
  }
  if (!signature) {
    return false;
  }

  const parts = signature.split(",").reduce((acc: Record<string, string>, cur) => {
    const [k, v] = cur.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * Returns true if this provider transaction was already processed (idempotent webhook handling).
 */
export async function isPaymentTransactionProcessed(
  provider: string,
  providerTransactionId: string
): Promise<boolean> {
  if (!providerTransactionId) {
    return false;
  }
  const existing = await prisma.payment.findFirst({
    where: {
      provider,
      providerTransactionId,
      status: "SUCCEEDED",
    },
  });
  return Boolean(existing);
}
