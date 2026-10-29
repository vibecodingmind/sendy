import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function GET() {
  try {
    const { user } = await requireTenantContext();
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || "";

    const sessions = await prisma.userSession.findMany({
      where: { userId: user.id },
      orderBy: { lastActiveAt: "desc" },
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress || "Unknown IP",
      userAgent: s.userAgent || "Unknown Device / Browser",
      lastActiveAt: s.lastActiveAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: s.sessionToken === currentToken,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { user } = await requireTenantContext();
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value || "";

    const result = await prisma.userSession.deleteMany({
      where: {
        userId: user.id,
        NOT: {
          sessionToken: currentToken,
        },
      },
    });

    return NextResponse.json({
      message: "All other device sessions have been revoked.",
      revokedCount: result.count,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
