import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const { organization } = await requireTenantContext();

    const aliases = await prisma.mailboxAlias.findMany({
      where: { organizationId: organization.id },
      include: {
        destinationMailbox: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        domain: {
          select: { id: true, name: true },
        },
      },
      orderBy: { sourceAddress: "asc" },
    });

    return NextResponse.json({ aliases });
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
    const { domainId, aliasPrefix, destinationMailboxId } = body;

    if (!domainId || !aliasPrefix || !destinationMailboxId) {
      return NextResponse.json(
        { error: "Domain, alias prefix, and destination mailbox are required." },
        { status: 400 }
      );
    }

    // Verify plan limits
    if (subscription?.plan) {
      const currentCount = await prisma.mailboxAlias.count({
        where: { organizationId: organization.id },
      });
      if (currentCount >= subscription.plan.maxAliases) {
        return NextResponse.json(
          { error: `Plan limit reached. Your plan allows up to ${subscription.plan.maxAliases} aliases.` },
          { status: 403 }
        );
      }
    }

    // Verify domain belongs to organization
    const domain = await prisma.domain.findFirst({
      where: { id: domainId, organizationId: organization.id },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found." }, { status: 404 });
    }

    // Verify destination mailbox belongs to organization
    const destMailbox = await prisma.mailbox.findFirst({
      where: { id: destinationMailboxId, organizationId: organization.id },
    });
    if (!destMailbox) {
      return NextResponse.json({ error: "Destination mailbox not found." }, { status: 404 });
    }

    const cleanPrefix = aliasPrefix.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
    const fullAlias = `${cleanPrefix}@${domain.name}`;

    // Verify uniqueness
    const existing = await prisma.mailboxAlias.findUnique({
      where: { sourceAddress: fullAlias },
    });
    if (existing) {
      return NextResponse.json({ error: `Alias ${fullAlias} already exists.` }, { status: 409 });
    }

    // Check that alias is not the destination mailbox itself
    if (fullAlias === destMailbox.email) {
      return NextResponse.json({ error: "An alias cannot point to itself." }, { status: 400 });
    }

    // Provision in mail provider
    const provider = await MailServerAllocator.getProviderForServer(domain.mailServerId);
    await provider.createAlias(fullAlias, destMailbox.email);

    // Save in DB
    const aliasRecord = await prisma.mailboxAlias.create({
      data: {
        organizationId: organization.id,
        domainId: domain.id,
        sourceAddress: fullAlias,
        destinationMailboxId: destMailbox.id,
        status: "ACTIVE",
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "ALIAS_CREATED",
      resourceType: "MailboxAlias",
      resourceId: aliasRecord.id,
      metadata: { source: fullAlias, destination: destMailbox.email },
    });

    return NextResponse.json(
      { message: "Alias created successfully.", alias: aliasRecord },
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
      return NextResponse.json({ error: "Alias ID is required." }, { status: 400 });
    }

    const alias = await prisma.mailboxAlias.findFirst({
      where: { id, organizationId: organization.id },
      include: { destinationMailbox: true, domain: true },
    });

    if (!alias) {
      return NextResponse.json({ error: "Alias not found." }, { status: 404 });
    }

    const provider = await MailServerAllocator.getProviderForServer(alias.domain.mailServerId);
    await provider.deleteAlias(alias.sourceAddress, alias.destinationMailbox.email);

    await prisma.mailboxAlias.delete({ where: { id: alias.id } });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "ALIAS_DELETED",
      resourceType: "MailboxAlias",
      resourceId: alias.id,
      metadata: { source: alias.sourceAddress },
    });

    return NextResponse.json({ message: "Alias deleted successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
