import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { hashDovecotPassword } from "@/lib/auth/password";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const domainId = searchParams.get("domainId");

    const where: { organizationId: string; domainId?: string } = {
      organizationId: organization.id,
    };
    if (domainId) {
      where.domainId = domainId;
    }

    const mailboxes = await prisma.mailbox.findMany({
      where,
      include: {
        domain: {
          select: { id: true, name: true, status: true },
        },
        aliases: {
          select: { id: true, sourceAddress: true, status: true },
        },
      },
      orderBy: { email: "asc" },
    });

    // Serialize BigInt usedStorageBytes for JSON response
    const serialized = mailboxes.map((mb) => ({
      ...mb,
      usedStorageBytes: Number(mb.usedStorageBytes),
      passwordHash: undefined, // Never expose password hash!
    }));

    return NextResponse.json({ mailboxes: serialized });
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
    const { domainId, username, firstName, lastName, password, storageLimitMb } = body;

    if (!domainId || !username || !password) {
      return NextResponse.json(
        { error: "Domain, username, and password are required." },
        { status: 400 }
      );
    }

    // Verify subscription status
    if (subscription && !["TRIAL", "ACTIVE", "GRACE_PERIOD"].includes(subscription.status)) {
      return NextResponse.json(
        { error: "Your subscription is suspended or expired. Please renew to create mailboxes." },
        { status: 403 }
      );
    }

    // Verify domain belongs to organization
    const domain = await prisma.domain.findFirst({
      where: {
        id: domainId,
        organizationId: organization.id,
      },
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain does not belong to your organization." },
        { status: 404 }
      );
    }

    if (!domain.isVerified) {
      return NextResponse.json(
        {
          error:
            "Domain DNS is not verified yet. Complete MX, SPF, DKIM, and DMARC verification before creating mailboxes.",
        },
        { status: 403 }
      );
    }

    // Check Plan Limits (mailboxes)
    if (subscription?.plan) {
      const currentMailboxes = await prisma.mailbox.count({
        where: { organizationId: organization.id },
      });
      if (currentMailboxes >= subscription.plan.maxMailboxes) {
        return NextResponse.json(
          {
            error: `Plan limit reached. Your plan allows up to ${subscription.plan.maxMailboxes} mailboxes. Please upgrade your plan.`,
          },
          { status: 403 }
        );
      }
    }

    // Validate Password
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Clean username and construct email
    const cleanUser = username.toLowerCase().trim().replace(/[^a-z0-9._-]/g, "");
    if (!cleanUser) {
      return NextResponse.json({ error: "Invalid mailbox username." }, { status: 400 });
    }
    const fullEmail = `${cleanUser}@${domain.name}`;

    // Verify uniqueness
    const existing = await prisma.mailbox.findUnique({
      where: { email: fullEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: `The mailbox ${fullEmail} already exists.` },
        { status: 409 }
      );
    }

    // Hash password with Dovecot SSHA512
    const dovecotHash = hashDovecotPassword(password);
    const limitMb = storageLimitMb ? Math.max(1024, parseInt(storageLimitMb, 10)) : 10240; // Default 10GB

    // Provision via MailProvider
    const provider = await MailServerAllocator.getProviderForServer(domain.mailServerId);
    await provider.createMailbox({
      email: fullEmail,
      name: `${firstName || ""} ${lastName || ""}`.trim() || cleanUser,
      passwordPlain: password,
      passwordHash: dovecotHash,
      quotaMb: limitMb,
    });

    // Save mailbox record
    const mailboxRecord = await prisma.mailbox.create({
      data: {
        organizationId: organization.id,
        domainId: domain.id,
        email: fullEmail,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        storageLimitMb: limitMb,
        usedStorageBytes: BigInt(0),
        status: "ACTIVE",
        passwordHash: dovecotHash,
      },
    });

    // Increment allocated mailbox count on MailServer
    if (domain.mailServerId) {
      await prisma.mailServer.update({
        where: { id: domain.mailServerId },
        data: { allocatedMailboxes: { increment: 1 } },
      }).catch(() => {});
    }

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "MAILBOX_CREATED",
      resourceType: "Mailbox",
      resourceId: mailboxRecord.id,
      metadata: { email: fullEmail },
    });

    return NextResponse.json(
      {
        message: `Mailbox ${fullEmail} created successfully.`,
        mailbox: {
          id: mailboxRecord.id,
          email: mailboxRecord.email,
          firstName: mailboxRecord.firstName,
          lastName: mailboxRecord.lastName,
          storageLimitMb: mailboxRecord.storageLimitMb,
          usedStorageBytes: 0,
          status: mailboxRecord.status,
          createdAt: mailboxRecord.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[MAILBOX_CREATE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
