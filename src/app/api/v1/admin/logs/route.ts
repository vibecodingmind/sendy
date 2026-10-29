import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
