import jwt from "jsonwebtoken";

const DEV_JWT_FALLBACK = "dev-super-secure-jwt-secret-key-replace-in-production-min-32-chars";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  const isProdRuntime =
    process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build";

  if (isProdRuntime) {
    if (!secret || secret.length < 32 || secret === DEV_JWT_FALLBACK) {
      throw new Error("JWT_SECRET must be configured in production.");
    }
    return secret;
  }

  return secret && secret.length >= 32 ? secret : DEV_JWT_FALLBACK;
}

export interface SessionPayload {
  userId: string;
  email: string;
  role: "SUPER_ADMIN" | "CUSTOMER_ADMIN" | "MAILBOX_USER";
  organizationId?: string;
  organizationSlug?: string;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function signVerificationToken(payload: { userId: string; email: string }): string {
  return jwt.sign({ ...payload, purpose: "email_verification" }, getJwtSecret(), { expiresIn: "24h" });
}

export function verifyVerificationToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & {
      purpose?: string;
      userId?: string;
      email?: string;
    };
    if (decoded && decoded.purpose === "email_verification" && decoded.userId && decoded.email) {
      return { userId: decoded.userId, email: decoded.email };
    }
    return null;
  } catch {
    return null;
  }
}
