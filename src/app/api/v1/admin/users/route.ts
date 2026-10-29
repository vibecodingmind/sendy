import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();
    const role = searchParams.get("role")?.trim();
    const status = searchParams.get("status")?.trim();
    const verified = searchParams.get("verified")?.trim();

    const where: any = {};

    if (query) {
      where.OR = [
        { email: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
      ];
    }

    if (role && role !== "ALL") {
      where.role = role;
    }

    if (status === "active") {
      where.isActive = true;
    } else if (status === "suspended") {
      where.isActive = false;
    }

    if (verified === "verified") {
      where.emailVerified = { not: null };
    } else if (verified === "unverified") {
      where.emailVerified = null;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
