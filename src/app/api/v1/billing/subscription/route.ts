import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";

export async function GET() {
  try {
    const { organization } = await requireTenantContext();

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: organization.id },
      include: {
        plan: true,
      },
    });

    const [domainCount, mailboxCount, aliasCount, forwarderCount, mailboxes] = await Promise.all([
      prisma.domain.count({ where: { organizationId: organization.id } }),
      prisma.mailbox.count({ where: { organizationId: organization.id } }),
      prisma.mailboxAlias.count({ where: { organizationId: organization.id } }),
      prisma.mailboxForwarder.count({ where: { organizationId: organization.id } }),
      prisma.mailbox.findMany({
        where: { organizationId: organization.id },
        select: { usedStorageBytes: true },
      }),
    ]);

    const totalUsedBytes = mailboxes.reduce(
      (acc, mb) => acc + Number(mb.usedStorageBytes),
      0
    );

    const availablePlans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyCents: "asc" },
    });

    return NextResponse.json({
      subscription,
      usage: {
        domains: domainCount,
        mailboxes: mailboxCount,
        aliases: aliasCount,
        forwarders: forwarderCount,
        usedStorageBytes: totalUsedBytes,
        usedStorageGb: parseFloat((totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2)),
      },
      availablePlans,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
