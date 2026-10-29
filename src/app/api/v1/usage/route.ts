import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";

export async function GET() {
  try {
    const { organization, subscription } = await requireTenantContext();

    const [domains, mailboxes] = await Promise.all([
      prisma.domain.findMany({
        where: { organizationId: organization.id },
        select: { id: true, name: true, isVerified: true, status: true },
      }),
      prisma.mailbox.findMany({
        where: { organizationId: organization.id },
        select: {
          id: true,
          email: true,
          domainId: true,
          storageLimitMb: true,
          usedStorageBytes: true,
          status: true,
        },
      }),
    ]);

    let totalUsedBytes = 0;
    const mailboxBreakdown = mailboxes.map((mb) => {
      const bytes = Number(mb.usedStorageBytes);
      totalUsedBytes += bytes;
      return {
        id: mb.id,
        email: mb.email,
        domainId: mb.domainId,
        usedBytes: bytes,
        usedMb: parseFloat((bytes / (1024 * 1024)).toFixed(2)),
        limitMb: mb.storageLimitMb,
        percent: Math.min(100, Math.round((bytes / (mb.storageLimitMb * 1024 * 1024)) * 100)),
        status: mb.status,
      };
    });

    const maxStorageGb = subscription?.plan?.maxStorageGb || 25;
    const maxStorageBytes = maxStorageGb * 1024 * 1024 * 1024;
    const overallPercent = Math.min(100, Math.round((totalUsedBytes / maxStorageBytes) * 100));

    return NextResponse.json({
      summary: {
        totalUsedBytes,
        totalUsedGb: parseFloat((totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2)),
        maxStorageGb,
        overallPercent,
        totalDomains: domains.length,
        maxDomains: subscription?.plan?.maxDomains || 1,
        totalMailboxes: mailboxes.length,
        maxMailboxes: subscription?.plan?.maxMailboxes || 5,
      },
      domains,
      mailboxes: mailboxBreakdown,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
