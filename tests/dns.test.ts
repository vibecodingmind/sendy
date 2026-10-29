import { describe, it, expect } from "vitest";
import { DnsVerifier } from "@/lib/dns/verifier";

describe("Live DNS Verification Engine", () => {
  it("should return comprehensive diagnostic structures for MX, SPF, DKIM, DMARC", async () => {
    // Check against a known public domain or test domain
    const result = await DnsVerifier.verifyDomain("example.com", "default", "sampleKey123");

    expect(result).toHaveProperty("overallValid");
    expect(result).toHaveProperty("mx");
    expect(result).toHaveProperty("spf");
    expect(result).toHaveProperty("dkim");
    expect(result).toHaveProperty("dmarc");

    expect(typeof result.mx.valid).toBe("boolean");
    expect(Array.isArray(result.mx.detected)).toBe(true);
    expect(typeof result.spf.valid).toBe("boolean");
    expect(typeof result.dkim.valid).toBe("boolean");
    expect(typeof result.dmarc.valid).toBe("boolean");

    expect(result.mx.expected).toBeDefined();
    expect(result.spf.expected).toBeDefined();
    expect(result.dkim.expected).toBeDefined();
    expect(result.dmarc.expected).toBeDefined();
  });

  it("should handle non-existent domains gracefully without throwing unhandled exceptions", async () => {
    const invalidDomain = `non-existent-${Date.now()}-test-domain-xyz123.com`;
    const result = await DnsVerifier.verifyDomain(invalidDomain);

    expect(result.overallValid).toBe(false);
    expect(result.mx.valid).toBe(false);
    expect(result.spf.valid).toBe(false);
    expect(result.dkim.valid).toBe(false);
    expect(result.dmarc.valid).toBe(false);
    expect(result.mx.message).toBeDefined();
  });
});
