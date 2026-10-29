import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DnsVerifier } from "@/lib/dns/verifier";
import { getAppSettings } from "@/lib/config";
import { assertCronAuthorized } from "@/lib/http/cronAuth";

/**
 * Background Cron Job: Routine DNS Diagnostics.
 * Re-checks MX, SPF, DKIM, DMARC for all hosted domains to alert on misconfigurations.
 * Trigger via Cloud Scheduler, systemd timer, or curl with Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  try {
    const cronDenied = assertCronAuthorized(request);
    if (cronDenied) {
      return cronDenied;
    }

    const settings = await getAppSettings();
    const domains = await prisma.domain.findMany({
      where: {
        status: { notIn: ["DELETED"] },
      },
    });

    const results = [];

    for (const domain of domains) {
      try {
        const check = await DnsVerifier.verifyDomain(
          domain.name,
          domain.dkimSelector || settings.mailDkimSelector,
          domain.dkimPublicKey || undefined
        );

        const isPassing = check.overallValid;

        await prisma.$transaction([
          prisma.domain.update({
            where: { id: domain.id },
            data: {
              isVerified: isPassing,
              status: isPassing ? "VERIFIED" : "PENDING_VERIFICATION",
              verifiedAt: isPassing ? new Date() : domain.verifiedAt,
            },
          }),
          prisma.domainDnsCheck.create({
            data: {
              domainId: domain.id,
              mxValid: check.mx.valid,
              mxDetails: check.mx.message || (check.mx.detected.length ? check.mx.detected.join(", ") : null),
              spfValid: check.spf.valid,
              spfDetails: check.spf.message || (check.spf.detected.length ? check.spf.detected.join(", ") : null),
              dkimValid: check.dkim.valid,
              dkimDetails: check.dkim.message || (check.dkim.detected.length ? check.dkim.detected.join(", ") : null),
              dmarcValid: check.dmarc.valid,
              dmarcDetails: check.dmarc.message || (check.dmarc.detected.length ? check.dmarc.detected.join(", ") : null),
              overallValid: isPassing,
            },
          }),
        ]);

        results.push({
          domain: domain.name,
          verified: isPassing,
        });
      } catch (checkErr: any) {
        results.push({
          domain: domain.name,
          error: checkErr.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: any) {
    console.error("DNS check cron error:", err);
    return NextResponse.json({ error: "DNS cron failed", details: err.message }, { status: 500 });
  }
}
