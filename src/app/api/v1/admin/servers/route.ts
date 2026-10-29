import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    await requireSuperAdmin();

    const servers = await prisma.mailServer.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { organizations: true, domains: true },
        },
      },
    });

    // Run health checks in parallel
    const enrichedServers = await Promise.all(
      servers.map(async (srv) => {
        try {
          const provider = await MailServerAllocator.getProviderForServer(srv.id);
          const health = await provider.checkServerHealth();
          const { metadata: _metadata, ...safeServer } = srv;
          return {
            ...safeServer,
            hasMetadata: Boolean(srv.metadata),
            health,
          };
        } catch (err: unknown) {
          const { metadata: _metadata, ...safeServer } = srv;
          return {
            ...safeServer,
            hasMetadata: Boolean(srv.metadata),
            health: {
              online: false,
              latencyMs: 0,
              smtpReachable: false,
              imapReachable: false,
              dbReachable: false,
              message: (err as Error).message,
            },
          };
        }
      })
    );

    return NextResponse.json({ servers: enrichedServers });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();
    const { name, hostname, ipAddress, location, providerType, capacityMailboxes, capacityStorageGb } = body;

    if (!name || !hostname || !ipAddress) {
      return NextResponse.json(
        { error: "Server name, hostname, and IP address are required." },
        { status: 400 }
      );
    }

    const server = await prisma.mailServer.create({
      data: {
        name: name.trim().toUpperCase(),
        hostname: hostname.trim().toLowerCase(),
        ipAddress: ipAddress.trim(),
        location: location?.trim() || "Default Region",
        providerType: providerType || "mock",
        capacityMailboxes: capacityMailboxes ? parseInt(capacityMailboxes, 10) : 1000,
        capacityStorageGb: capacityStorageGb ? parseInt(capacityStorageGb, 10) : 5000,
        status: "ONLINE",
        isActive: true,
      },
    });

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: "MAIL_SERVER_CREATED",
      resourceType: "MailServer",
      resourceId: server.id,
      metadata: { serverName: server.name },
    });

    return NextResponse.json({ message: "Mail server created successfully.", server }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
