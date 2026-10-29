import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";
import { getAppSettings } from "@/lib/config";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await requireTenantContext();

    const domain = await prisma.domain.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        dnsChecks: {
          orderBy: { checkedAt: "desc" },
          take: 5,
        },
        mailboxes: {
          select: { id: true, email: true, status: true, storageLimitMb: true },
        },
      },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    const settings = await getAppSettings();

    return NextResponse.json({
      domain,
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
          host: `${domain.dkimSelector}._domainkey`,
          value: domain.dkimPublicKey
            ? `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}`
            : "Generating key...",
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
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Call mail provider to delete from infrastructure
    const provider = await MailServerAllocator.getProviderForServer(domain.mailServerId);
    await provider.deleteDomain(domain.name);

    // Delete from database
    await prisma.domain.delete({
      where: { id: domain.id },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "DOMAIN_DELETED",
      resourceType: "Domain",
      resourceId: domain.id,
      metadata: { domain: domain.name },
    });

    return NextResponse.json({ message: "Domain deleted successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization, user } = await requireTenantContext();
    const body = await req.json();

    const domain = await prisma.domain.findFirst({
      where: { id, organizationId: organization.id },
    });

    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    const { catchAllMailboxId } = body;

    if (catchAllMailboxId) {
      const mb = await prisma.mailbox.findFirst({
        where: { id: catchAllMailboxId, domainId: domain.id, organizationId: organization.id },
      });
      if (!mb) {
        return NextResponse.json(
          { error: "Selected catch-all mailbox not found for this domain." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: {
        catchAllMailboxId: catchAllMailboxId ? String(catchAllMailboxId) : null,
      },
      include: {
        mailboxes: {
          select: { id: true, email: true },
        },
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "DOMAIN_CATCHALL_UPDATED",
      resourceType: "Domain",
      resourceId: domain.id,
      metadata: {
        domain: domain.name,
        catchAllMailboxId: updated.catchAllMailboxId,
      },
    });

    return NextResponse.json({
      message: updated.catchAllMailboxId
        ? "Catch-All mailbox routing enabled."
        : "Catch-All routing disabled (unaddressed emails will bounce).",
      domain: updated,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
