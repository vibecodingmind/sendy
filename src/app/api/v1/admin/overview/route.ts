import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireSuperAdmin();

    const [
      totalCustomers,
      activeCustomers,
      totalDomains,
      verifiedDomains,
      totalMailboxes,
      mailboxes,
      subscriptions,
      servers,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: "ACTIVE" } }),
      prisma.domain.count(),
      prisma.domain.count({ where: { isVerified: true } }),
      prisma.mailbox.count(),
      prisma.mailbox.findMany({ select: { usedStorageBytes: true } }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: true },
      }),
      prisma.mailServer.findMany({ where: { isActive: true } }),
    ]);

    const totalStorageBytes = mailboxes.reduce(
      (acc, mb) => acc + Number(mb.usedStorageBytes),
      0
    );

    const monthlyRevenueCents = subscriptions.reduce(
      (acc, s) => acc + (s.plan?.priceMonthlyCents || 0),
      0
    );

    return NextResponse.json({
      overview: {
        totalCustomers,
        activeCustomers,
        totalDomains,
        verifiedDomains,
        totalMailboxes,
        totalStorageBytes,
        totalStorageGb: parseFloat((totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)),
        monthlyRevenueCents,
        monthlyRevenueUsd: parseFloat((monthlyRevenueCents / 100).toFixed(2)),
        activeSubscriptionsCount: subscriptions.length,
        totalServers: servers.length,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
