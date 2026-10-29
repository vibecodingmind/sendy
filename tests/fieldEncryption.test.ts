import { describe, it, expect } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto/fieldEncryption";

describe("fieldEncryption", () => {
  it("round-trips DKIM private key material", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
    const encrypted = encryptSecret(pem);
    expect(encrypted).not.toContain(pem);
    expect(decryptSecret(encrypted)).toBe(pem);
  });
});
