import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { AbuseProtection } from "@/lib/abuse";
import { prisma } from "@/lib/db/prisma";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { action, organizationId, mailboxEmail, mailboxId, reason } = body;

    if (!action || !reason?.trim()) {
      return NextResponse.json({ error: "Action and reason are required." }, { status: 400 });
    }

    if (action === "SUSPEND_ORGANIZATION") {
      const target = String(organizationId || body.target || "").trim();
      if (!target) {
        return NextResponse.json({ error: "organizationId or target is required." }, { status: 400 });
      }

      const org =
        (await prisma.organization.findUnique({ where: { id: target } })) ||
        (await prisma.organization.findUnique({ where: { slug: target } }));

      if (!org) {
        return NextResponse.json({ error: "Organization not found." }, { status: 404 });
      }

      await AbuseProtection.triggerAbuseAction(
        org.id,
        "SUSPEND_ORGANIZATION",
        org.id,
        reason.trim()
      );

      const orgDetails = await prisma.organization.findUnique({
        where: { id: org.id },
        include: { domains: true, mailboxes: { include: { domain: true } } },
      });

      if (orgDetails) {
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
      }

      return NextResponse.json({ message: "Organization suspended and mail services disabled." });
    }

    if (action === "SUSPEND_MAILBOX") {
      let resolvedMailboxId = mailboxId as string | undefined;
      let resolvedOrgId = organizationId as string | undefined;

      if (mailboxEmail && !resolvedMailboxId) {
        const mailbox = await prisma.mailbox.findUnique({
          where: { email: String(mailboxEmail).toLowerCase() },
          include: { domain: true },
        });
        if (!mailbox) {
          return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
        }
        resolvedMailboxId = mailbox.id;
        resolvedOrgId = mailbox.organizationId;

        if (mailbox.domain.mailServerId) {
          const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);
          await provider.suspendMailbox(mailbox.email).catch(() => {});
        }
      }

      if (!resolvedOrgId || !resolvedMailboxId) {
        return NextResponse.json(
          { error: "mailboxEmail or organizationId + mailboxId required." },
          { status: 400 }
        );
      }

      await AbuseProtection.triggerAbuseAction(
        resolvedOrgId,
        "SUSPEND_MAILBOX",
        resolvedMailboxId,
        reason.trim()
      );

      return NextResponse.json({ message: "Mailbox suspended." });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
