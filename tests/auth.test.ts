import { describe, it, expect } from "vitest";
import {
  hashUserPassword,
  verifyUserPassword,
  hashDovecotPassword,
  verifyDovecotPassword,
} from "@/lib/auth/password";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";

describe("Authentication & Password Hashing", () => {
  it("should securely hash and verify application user passwords with bcrypt", async () => {
    const plain = "SuperSecretPassword123!";
    const hash = await hashUserPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$2")).toBe(true);

    const match = await verifyUserPassword(plain, hash);
    expect(match).toBe(true);

    const mismatch = await verifyUserPassword("WrongPassword!", hash);
    expect(mismatch).toBe(false);
  });

  it("should generate and verify Dovecot-compatible {SSHA512} password hashes", () => {
    const mailboxPassword = "MailboxSecurePass!2026";
    const dovecotHash = hashDovecotPassword(mailboxPassword);

    expect(dovecotHash.startsWith("{SSHA512}")).toBe(true);

    const valid = verifyDovecotPassword(mailboxPassword, dovecotHash);
    expect(valid).toBe(true);

    const invalid = verifyDovecotPassword("DifferentPassword", dovecotHash);
    expect(invalid).toBe(false);
  });

  it("should sign and verify JWT session tokens", () => {
    const payload = {
      userId: "user-12345",
      email: "admin@monogrammail.com",
      role: "SUPER_ADMIN" as const,
      organizationId: "org-123",
      organizationSlug: "monogram",
    };

    const token = signSessionToken(payload);
    expect(typeof token).toBe("string");

    const decoded = verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it("should reject forged or corrupted JWT tokens", () => {
    const invalid = verifySessionToken("not.a.valid.jwt.token");
    expect(invalid).toBeNull();
  });
});
