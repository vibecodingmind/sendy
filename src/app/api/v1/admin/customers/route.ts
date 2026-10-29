import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";

export async function GET() {
  try {
    await requireSuperAdmin();

    const organizations = await prisma.organization.findMany({
      include: {
        subscription: { include: { plan: true } },
        mailServer: { select: { id: true, name: true } },
        _count: {
          select: { domains: true, mailboxes: true },
        },
        members: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, lastLoginAt: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ organizations });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { organizationId, status } = body;

    if (!organizationId || !["ACTIVE", "SUSPENDED"].includes(status)) {
      return NextResponse.json(
        { error: "Organization ID and valid status (ACTIVE, SUSPENDED) are required." },
        { status: 400 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { status },
    });

    const orgDetails = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        domains: true,
        mailboxes: { include: { domain: true } },
      },
    });

    if (orgDetails) {
      if (status === "SUSPENDED") {
        for (const domain of orgDetails.domains) {
          if (domain.mailServerId) {
            const provider = await MailServerAllocator.getProviderForServer(domain.mailServerId);
            await provider.suspendDomain(domain.name).catch(() => {});
          }
        }
        for (const mailbox of orgDetails.mailboxes) {
          if (mailbox.domain.mailServerId) {
            const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);
            await provider.suspendMailbox(mailbox.email).catch(() => {});
          }
          await prisma.mailbox.update({
            where: { id: mailbox.id },
            data: { status: "SUSPENDED" },
          });
        }
      } else if (status === "ACTIVE") {
        for (const domain of orgDetails.domains) {
          if (domain.mailServerId) {
            const provider = await MailServerAllocator.getProviderForServer(domain.mailServerId);
            await provider.activateDomain(domain.name).catch(() => {});
          }
        }
        for (const mailbox of orgDetails.mailboxes) {
          if (mailbox.domain.mailServerId) {
            const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);
            await provider.activateMailbox(mailbox.email).catch(() => {});
          }
          await prisma.mailbox.update({
            where: { id: mailbox.id },
            data: { status: "ACTIVE" },
          });
        }
      }
    }

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      organizationId: updated.id,
      action: status === "SUSPENDED" ? "ADMIN_CUSTOMER_SUSPENDED" : "ADMIN_CUSTOMER_ACTIVATED",
      resourceType: "Organization",
      resourceId: updated.id,
      metadata: { newStatus: status },
    });

    return NextResponse.json({ message: `Customer organization marked as ${status}.`, organization: updated });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
