import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { organization } = await requireTenantContext();
    const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
    if (q.length < 2) {
      return NextResponse.json({ domains: [], mailboxes: [], query: q });
    }

    const [domains, mailboxes] = await Promise.all([
      prisma.domain.findMany({
        where: {
          organizationId: organization.id,
          name: { contains: q },
        },
        select: { id: true, name: true, status: true, isVerified: true },
        take: 8,
        orderBy: { name: "asc" },
      }),
      prisma.mailbox.findMany({
        where: {
          organizationId: organization.id,
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        },
        select: { id: true, email: true, status: true, domain: { select: { name: true } } },
        take: 8,
        orderBy: { email: "asc" },
      }),
    ]);

    return NextResponse.json({ query: q, domains, mailboxes });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Search failed" }, { status: 500 });
  }
}
