import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { hashDovecotPassword } from "@/lib/auth/password";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization, user } = await requireTenantContext();
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const mailbox = await prisma.mailbox.findFirst({
      where: { id, organizationId: organization.id },
      include: { domain: true },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    }

    // Compute Dovecot compatible hash
    const dovecotHash = hashDovecotPassword(newPassword);

    // Call mail provider
    const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);
    await provider.changeMailboxPassword(mailbox.email, newPassword, dovecotHash);

    // Update in DB
    await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: { passwordHash: dovecotHash },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "MAILBOX_PASSWORD_RESET",
      resourceType: "Mailbox",
      resourceId: mailbox.id,
      metadata: { email: mailbox.email },
    });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
