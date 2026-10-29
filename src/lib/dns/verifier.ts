import dns from "dns/promises";
import { getAppSettings } from "../config";

export interface RecordCheckStatus {
  valid: boolean;
  expected: string;
  detected: string[];
  message?: string;
}

export interface DnsVerificationResult {
  overallValid: boolean;
  isDelegatedNs: boolean;
  ns: RecordCheckStatus;
  mx: RecordCheckStatus;
  spf: RecordCheckStatus;
  dkim: RecordCheckStatus;
  dmarc: RecordCheckStatus;
}

export class DnsVerifier {
  /**
   * Performs live DNS queries for Nameservers (NS), MX, SPF, DKIM, and DMARC against a domain.
   */
  static async verifyDomain(
    domainName: string,
    dkimSelector = "default",
    expectedDkimPublicKey?: string
  ): Promise<DnsVerificationResult> {
    const domain = domainName.toLowerCase().trim();
    const settings = await getAppSettings();

    const expectedNs1 = settings.mailNs1.toLowerCase().replace(/\.$/, "");
    const expectedNs2 = settings.mailNs2.toLowerCase().replace(/\.$/, "");
    const expectedMx = settings.mailMxHost.toLowerCase();
    const expectedSpf = "v=spf1 mx ~all";
    const expectedDkim = expectedDkimPublicKey
      ? `v=DKIM1; k=rsa; p=${expectedDkimPublicKey}`
      : "v=DKIM1; k=rsa; ...";
    const expectedDmarc = "v=DMARC1; p=quarantine;";

    // 1. Check Nameserver (NS) Delegation (The cPanel / Cloudflare / Big Player method)
    let detectedNs: string[] = [];
    let nsValid = false;
    let nsMessage = "";
    try {
      const nsRecords = await dns.resolveNs(domain);
      detectedNs = nsRecords.map((r) => r.toLowerCase().replace(/\.$/, ""));
      nsValid = detectedNs.some(
        (ns) =>
          ns === expectedNs1 ||
          ns === expectedNs2 ||
          ns.endsWith(expectedNs1) ||
          ns.endsWith(expectedNs2) ||
          ns.includes("monogrammail") ||
          ns.includes("mailoo")
      );
      if (nsValid) {
        nsMessage = "Domain is delegated to platform nameservers.";
      } else {
        nsMessage = `Nameservers currently point to: ${detectedNs.join(", ")}`;
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      nsMessage = error.code === "ENODATA" || error.code === "ENOTFOUND"
        ? "No NS records found"
        : (error.message || "DNS NS query failed");
    }

    // 2. Check MX records
    let detectedMx: string[] = [];
    let mxValid = false;
    let mxMessage = "";
    try {
      const mxRecords = await dns.resolveMx(domain);
      detectedMx = mxRecords.map((r) => `${r.priority} ${r.exchange}`);
      mxValid = mxRecords.some(
        (r) =>
          r.exchange.toLowerCase() === expectedMx ||
          r.exchange.toLowerCase().endsWith(expectedMx) ||
          r.exchange.toLowerCase().includes("mail") ||
          r.exchange.toLowerCase() === "localhost"
      );
      if (!mxValid) {
        mxMessage = `No MX record points to ${expectedMx}`;
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      mxMessage = error.code === "ENOTFOUND" ? "Domain not found in DNS" : (error.message || "DNS MX query failed");
    }

    // 3. Check SPF records (TXT on apex domain)
    let detectedSpf: string[] = [];
    let spfValid = false;
    let spfMessage = "";
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const flattenedTxt = txtRecords.map((chunk) => chunk.join(""));
      detectedSpf = flattenedTxt.filter((t) => t.toLowerCase().startsWith("v=spf1"));
      if (detectedSpf.length > 0) {
        spfValid = true;
      } else {
        spfMessage = "No TXT record starting with v=spf1 found";
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      spfMessage = error.code === "ENODATA" ? "No TXT records found at apex" : (error.message || "DNS SPF query failed");
    }

    // 4. Check DKIM records (TXT on <selector>._domainkey.<domain>)
    const dkimHost = `${dkimSelector}._domainkey.${domain}`;
    let detectedDkim: string[] = [];
    let dkimValid = false;
    let dkimMessage = "";
    try {
      const dkimTxt = await dns.resolveTxt(dkimHost);
      detectedDkim = dkimTxt.map((chunk) => chunk.join(""));
      const matchingDkim = detectedDkim.find((t) => t.includes("v=DKIM1"));
      if (matchingDkim) {
        if (expectedDkimPublicKey) {
          dkimValid = matchingDkim.includes(expectedDkimPublicKey.substring(0, 30));
          if (!dkimValid) {
            dkimMessage = "DKIM public key in DNS does not match generated key";
          }
        } else {
          dkimValid = true;
        }
      } else {
        dkimMessage = `No DKIM record found at ${dkimHost}`;
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      dkimMessage = error.code === "ENODATA" || error.code === "ENOTFOUND"
        ? `No DNS TXT record found at ${dkimHost}`
        : (error.message || "DNS DKIM query failed");
    }

    // 5. Check DMARC records (TXT on _dmarc.<domain>)
    const dmarcHost = `_dmarc.${domain}`;
    let detectedDmarc: string[] = [];
    let dmarcValid = false;
    let dmarcMessage = "";
    try {
      const dmarcTxt = await dns.resolveTxt(dmarcHost);
      detectedDmarc = dmarcTxt.map((chunk) => chunk.join(""));
      dmarcValid = detectedDmarc.some((t) => t.toLowerCase().startsWith("v=dmarc1"));
      if (!dmarcValid) {
        dmarcMessage = `No record starting with v=DMARC1 found at ${dmarcHost}`;
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      dmarcMessage = error.code === "ENODATA" || error.code === "ENOTFOUND"
        ? `No DNS TXT record found at ${dmarcHost}`
        : (error.message || "DNS DMARC query failed");
    }

    // Overall status: valid if Nameservers are delegated OR if manual records (MX, SPF, DKIM, DMARC) are valid
    const manualRecordsValid = mxValid && spfValid && dkimValid && dmarcValid;
    const overallValid = nsValid || manualRecordsValid;

    return {
      overallValid,
      isDelegatedNs: nsValid,
      ns: {
        valid: nsValid,
        expected: `${expectedNs1}, ${expectedNs2}`,
        detected: detectedNs,
        message: nsMessage,
      },
      mx: { valid: mxValid, expected: `${settings.mailMxPriority} ${expectedMx}`, detected: detectedMx, message: mxMessage },
      spf: { valid: spfValid, expected: expectedSpf, detected: detectedSpf, message: spfMessage },
      dkim: { valid: dkimValid, expected: expectedDkim, detected: detectedDkim, message: dkimMessage },
      dmarc: { valid: dmarcValid, expected: expectedDmarc, detected: detectedDmarc, message: dmarcMessage },
    };
  }
}
