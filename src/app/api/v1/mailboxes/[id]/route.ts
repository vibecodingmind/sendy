import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await requireTenantContext();

    const mailbox = await prisma.mailbox.findFirst({
      where: {
        id,
        organizationId: organization.id,
      },
      include: {
        domain: true,
        aliases: true,
      },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    }

    // Get live usage from mail provider
    const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);
    let liveUsage = { usedBytes: Number(mailbox.usedStorageBytes), quotaBytes: mailbox.storageLimitMb * 1024 * 1024 };
    try {
      liveUsage = await provider.getMailboxUsage(mailbox.email);
      // Update DB cached usage
      await prisma.mailbox.update({
        where: { id: mailbox.id },
        data: { usedStorageBytes: BigInt(liveUsage.usedBytes) },
      });
    } catch {
      // Use DB fallback
    }

    return NextResponse.json({
      mailbox: {
        id: mailbox.id,
        email: mailbox.email,
        firstName: mailbox.firstName,
        lastName: mailbox.lastName,
        storageLimitMb: mailbox.storageLimitMb,
        usedStorageBytes: liveUsage.usedBytes,
        quotaBytes: liveUsage.quotaBytes,
        status: mailbox.status,
        domain: {
          id: mailbox.domain.id,
          name: mailbox.domain.name,
        },
        aliases: mailbox.aliases,
        createdAt: mailbox.createdAt,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization, user } = await requireTenantContext();
    const body = await req.json();
    const { status, storageLimitMb, firstName, lastName } = body;

    const mailbox = await prisma.mailbox.findFirst({
      where: { id, organizationId: organization.id },
      include: { domain: true },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    }

    const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);

    // Update in mail provider
    if (status === "SUSPENDED") {
      await provider.suspendMailbox(mailbox.email);
    } else if (status === "ACTIVE") {
      await provider.activateMailbox(mailbox.email);
    }

    if (storageLimitMb !== undefined) {
      await provider.updateMailbox(mailbox.email, { quotaMb: parseInt(storageLimitMb, 10) });
    }

    const updated = await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: {
        status: status || mailbox.status,
        storageLimitMb: storageLimitMb ? parseInt(storageLimitMb, 10) : mailbox.storageLimitMb,
        firstName: firstName !== undefined ? firstName : mailbox.firstName,
        lastName: lastName !== undefined ? lastName : mailbox.lastName,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "MAILBOX_UPDATED",
      resourceType: "Mailbox",
      resourceId: mailbox.id,
      metadata: { status, storageLimitMb },
    });

    return NextResponse.json({
      message: "Mailbox updated successfully.",
      mailbox: {
        ...updated,
        usedStorageBytes: Number(updated.usedStorageBytes),
        passwordHash: undefined,
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

    const mailbox = await prisma.mailbox.findFirst({
      where: { id, organizationId: organization.id },
      include: { domain: true },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    }

    const provider = await MailServerAllocator.getProviderForServer(mailbox.domain.mailServerId);
    await provider.deleteMailbox(mailbox.email);

    await prisma.mailbox.delete({
      where: { id: mailbox.id },
    });

    // Decrement mail server counter
    if (mailbox.domain.mailServerId) {
      await prisma.mailServer.update({
        where: { id: mailbox.domain.mailServerId },
        data: { allocatedMailboxes: { decrement: 1 } },
      }).catch(() => {});
    }

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "MAILBOX_DELETED",
      resourceType: "Mailbox",
      resourceId: mailbox.id,
      metadata: { email: mailbox.email },
    });

    return NextResponse.json({ message: "Mailbox deleted successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
