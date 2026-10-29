const DEV_JWT_PLACEHOLDER =
  "dev-super-secure-jwt-secret-key-replace-in-production-min-32-chars";

let validated = false;

/**
 * Validates required secrets and safe defaults when NODE_ENV=production.
 * Call from instrumentation and long-lived server entrypoints.
 */
export function validateProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  // Next.js sets NEXT_PHASE during `next build`; skip strict checks until runtime.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (validated) {
    return;
  }

  const errors: string[] = [];

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32 || jwt === DEV_JWT_PLACEHOLDER) {
    errors.push("JWT_SECRET must be set to a unique value of at least 32 characters.");
  }

  if (!process.env.CRON_SECRET?.trim()) {
    errors.push("CRON_SECRET is required in production (cron endpoints must not be public).");
  }

  const paymentProvider = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (paymentProvider === "mock") {
    errors.push('PAYMENT_PROVIDER must not be "mock" in production.');
  }

  if (paymentProvider === "stripe") {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      errors.push("STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe.");
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
      errors.push("STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe.");
    }
  }

  if (paymentProvider === "azampay") {
    if (!process.env.AZAMPAY_CLIENT_ID?.trim() || !process.env.AZAMPAY_CLIENT_SECRET?.trim()) {
      errors.push("AZAMPAY_CLIENT_ID and AZAMPAY_CLIENT_SECRET are required when PAYMENT_PROVIDER=azampay.");
    }
    if (!process.env.AZAMPAY_WEBHOOK_SECRET?.trim()) {
      errors.push("AZAMPAY_WEBHOOK_SECRET is required in production for callback verification.");
    }
  }

  const mailProvider = (process.env.MAIL_PROVIDER || "mock").toLowerCase();
  if (mailProvider === "mock") {
    errors.push('MAIL_PROVIDER must be "iredmail" in production (mock mail is not allowed).');
  } else if (mailProvider === "iredmail") {
    if (!process.env.IREDMAIL_DB_PASSWORD?.trim()) {
      errors.push("IREDMAIL_DB_PASSWORD is required when MAIL_PROVIDER=iredmail.");
    }
  }

  if (process.env.AZAMPAY_SIMULATE === "true") {
    errors.push("AZAMPAY_SIMULATE must not be true in production.");
  }

  if (errors.length > 0) {
    throw new Error(`Production environment validation failed:\n- ${errors.join("\n- ")}`);
  }

  validated = true;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
