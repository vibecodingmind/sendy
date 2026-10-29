import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  try {
    const { organization } = await requireTenantContext();

    const forwarders = await prisma.mailboxForwarder.findMany({
      where: { organizationId: organization.id },
      include: {
        domain: { select: { id: true, name: true } },
      },
      orderBy: { sourceAddress: "asc" },
    });

    return NextResponse.json({ forwarders });
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
    const { domainId, sourcePrefix, destinationAddress, keepLocalCopy } = body;

    if (!domainId || !sourcePrefix || !destinationAddress) {
      return NextResponse.json(
        { error: "Domain, source prefix, and destination email address are required." },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(destinationAddress)) {
      return NextResponse.json(
        { error: "Destination address must be a valid email format." },
        { status: 400 }
      );
    }

    // Verify plan limits
    if (subscription?.plan) {
      const currentCount = await prisma.mailboxForwarder.count({
        where: { organizationId: organization.id },
      });
      if (currentCount >= subscription.plan.maxForwarders) {
        return NextResponse.json(
          { error: `Plan limit reached. Your plan allows up to ${subscription.plan.maxForwarders} forwarders.` },
          { status: 403 }
        );
      }
    }

    const domain = await prisma.domain.findFirst({
      where: { id: domainId, organizationId: organization.id },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    const cleanPrefix = sourcePrefix.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
    const fullSource = `${cleanPrefix}@${domain.name}`;

    // Loop detection
    if (fullSource === destinationAddress.toLowerCase().trim()) {
      return NextResponse.json(
        { error: "Cannot forward an address to itself (infinite mail loop)." },
        { status: 400 }
      );
    }

    // Provision in mail provider
    const provider = await MailServerAllocator.getProviderForServer(domain.mailServerId);
    await provider.createForwarder(fullSource, destinationAddress, !!keepLocalCopy);

    const forwarderRecord = await prisma.mailboxForwarder.create({
      data: {
        organizationId: organization.id,
        domainId: domain.id,
        sourceAddress: fullSource,
        destinationAddress: destinationAddress.toLowerCase().trim(),
        keepLocalCopy: !!keepLocalCopy,
        status: "ACTIVE",
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "FORWARDER_CREATED",
      resourceType: "MailboxForwarder",
      resourceId: forwarderRecord.id,
      metadata: { source: fullSource, destination: destinationAddress },
    });

    return NextResponse.json(
      { message: "Forwarder created successfully.", forwarder: forwarderRecord },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { organization, user } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Forwarder ID is required." }, { status: 400 });
    }

    const forwarder = await prisma.mailboxForwarder.findFirst({
      where: { id, organizationId: organization.id },
      include: { domain: true },
    });

    if (!forwarder) {
      return NextResponse.json({ error: "Forwarder not found." }, { status: 404 });
    }

    const provider = await MailServerAllocator.getProviderForServer(forwarder.domain.mailServerId);
    await provider.deleteForwarder(forwarder.sourceAddress, forwarder.destinationAddress);

    await prisma.mailboxForwarder.delete({ where: { id: forwarder.id } });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "FORWARDER_DELETED",
      resourceType: "MailboxForwarder",
      resourceId: forwarder.id,
      metadata: { source: forwarder.sourceAddress, destination: forwarder.destinationAddress },
    });

    return NextResponse.json({ message: "Forwarder removed successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
