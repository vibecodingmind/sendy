import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";
import { getAppSettings } from "@/lib/config";

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

export async function GET() {
  try {
    const { organization } = await requireTenantContext();

    const domains = await prisma.domain.findMany({
      where: { organizationId: organization.id },
      include: {
        _count: {
          select: { mailboxes: true, aliases: true, forwarders: true },
        },
        mailboxes: {
          select: { id: true, email: true },
        },
        dnsChecks: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ domains });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organization, subscription, user } = await requireTenantContext();
    const body = await req.json();
    const rawDomain = (body.domain || "").toLowerCase().trim();

    if (!rawDomain || !DOMAIN_REGEX.test(rawDomain)) {
      return NextResponse.json(
        { error: "Please enter a valid domain name (e.g. yourcompany.com)." },
        { status: 400 }
      );
    }

    // Check Plan Limits
    if (subscription?.plan) {
      const currentCount = await prisma.domain.count({
        where: { organizationId: organization.id },
      });
      if (currentCount >= subscription.plan.maxDomains) {
        return NextResponse.json(
          {
            error: `Your current plan allows a maximum of ${subscription.plan.maxDomains} domain(s). Please upgrade to add more.`,
          },
          { status: 403 }
        );
      }
    }

    // Check Uniqueness
    const existing = await prisma.domain.findUnique({
      where: { name: rawDomain },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This domain has already been added to the platform." },
        { status: 409 }
      );
    }

    // Allocate Mail Server & MailProvider
    const server = await MailServerAllocator.allocateServer();
    const provider = await MailServerAllocator.getProviderForServer(server.id);

    // Generate DKIM key pair via MailProvider
    const dkim = await provider.getOrCreateDkimRecord(rawDomain, "default");

    // Provision domain in mail provider
    await provider.createDomain({
      domain: rawDomain,
      maxQuotaMb: (subscription?.plan?.maxStorageGb || 25) * 1024,
      maxMailboxes: subscription?.plan?.maxMailboxes || 5,
    });

    // Save domain record in DB
    const domainRecord = await prisma.domain.create({
      data: {
        organizationId: organization.id,
        mailServerId: server.id,
        name: rawDomain,
        status: "PENDING_VERIFICATION",
        dkimSelector: dkim.selector,
        dkimPublicKey: dkim.publicKey,
        isVerified: false,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "DOMAIN_CREATED",
      resourceType: "Domain",
      resourceId: domainRecord.id,
      metadata: { domain: rawDomain },
    });

    const settings = await getAppSettings();

    return NextResponse.json(
      {
        message: "Domain added successfully. Please configure your DNS records.",
        domain: domainRecord,
        dnsInstructions: {
          mx: {
            type: "MX",
            host: "@",
            value: settings.mailMxHost,
            priority: settings.mailMxPriority,
          },
          spf: {
            type: "TXT",
            host: "@",
            value: "v=spf1 mx ~all",
          },
          dkim: {
            type: "TXT",
            host: `${dkim.selector}._domainkey`,
            value: dkim.dnsTxtValue,
          },
          dmarc: {
            type: "TXT",
            host: "_dmarc",
            value: "v=DMARC1; p=quarantine;",
          },
        },
        nameservers: {
          ns1: settings.mailNs1,
          ns2: settings.mailNs2,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DOMAIN_CREATE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
