import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { DnsVerifier } from "@/lib/dns/verifier";
import { logAuditEvent } from "@/lib/audit";
import { syncDkimFromEncryptedDomainRecord } from "@/lib/mail/dkimSigningSync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization, user } = await requireTenantContext();

    const domain = await prisma.domain.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    // Run live DNS checks
    const verification = await DnsVerifier.verifyDomain(
      domain.name,
      domain.dkimSelector,
      domain.dkimPublicKey || undefined
    );

    // Record check in DB
    await prisma.domainDnsCheck.create({
      data: {
        domainId: domain.id,
        mxValid: verification.mx.valid,
        mxDetails: JSON.stringify(verification.mx),
        spfValid: verification.spf.valid,
        spfDetails: JSON.stringify(verification.spf),
        dkimValid: verification.dkim.valid,
        dkimDetails: JSON.stringify(verification.dkim),
        dmarcValid: verification.dmarc.valid,
        dmarcDetails: JSON.stringify(verification.dmarc),
        overallValid: verification.overallValid,
      },
    });

    // Update domain status if valid
    if (verification.overallValid) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          isVerified: true,
          isManagedDns: verification.isDelegatedNs,
          status: "VERIFIED",
          verifiedAt: new Date(),
          lastDnsCheckAt: new Date(),
        },
      });

      await logAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        organizationId: organization.id,
        action: "DOMAIN_VERIFIED",
        resourceType: "Domain",
        resourceId: domain.id,
        metadata: { domain: domain.name },
      });

      const refreshed = await prisma.domain.findUnique({ where: { id: domain.id } });
      const dkimSync = refreshed
        ? await syncDkimFromEncryptedDomainRecord(refreshed)
        : { synced: false, message: "Domain not found for DKIM sync." };

      return NextResponse.json({
        domainId: domain.id,
        domainName: domain.name,
        isVerified: verification.overallValid,
        status: "VERIFIED",
        results: verification,
        dkimSync,
      });
    } else {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          lastDnsCheckAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      domainId: domain.id,
      domainName: domain.name,
      isVerified: verification.overallValid,
      status: verification.overallValid ? "VERIFIED" : domain.status,
      results: verification,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DNS_VERIFY_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
