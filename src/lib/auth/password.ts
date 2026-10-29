import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Hash application user password using bcrypt.
 */
export async function hashUserPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify application user password against bcrypt hash.
 */
export async function verifyUserPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a Dovecot/iRedMail compatible {SSHA512} password hash.
 * Format: {SSHA512}Base64( SHA512(password + salt) + salt )
 */
export function hashDovecotPassword(password: string): string {
  const salt = crypto.randomBytes(8);
  const hash = crypto.createHash("sha512");
  hash.update(Buffer.from(password, "utf8"));
  hash.update(salt);
  const digest = hash.digest();
  const combined = Buffer.concat([digest, salt]);
  return `{SSHA512}${combined.toString("base64")}`;
}

/**
 * Verify a password against a Dovecot {SSHA512} hash.
 */
export function verifyDovecotPassword(password: string, ssha512Hash: string): boolean {
  if (!ssha512Hash.startsWith("{SSHA512}")) {
    return false;
  }
  const base64Data = ssha512Hash.slice("{SSHA512}".length);
  const combined = Buffer.from(base64Data, "base64");
  if (combined.length <= 64) {
    return false;
  }
  const digest = combined.subarray(0, 64);
  const salt = combined.subarray(64);

  const hash = crypto.createHash("sha512");
  hash.update(Buffer.from(password, "utf8"));
  hash.update(salt);
  const calculatedDigest = hash.digest();

  return crypto.timingSafeEqual(digest, calculatedDigest);
}
