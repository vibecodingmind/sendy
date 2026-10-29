import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/auth/jwt";
import { attachSessionCookie } from "@/lib/auth/sessionCookie";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = user.memberships.find((m) => m.organizationId === organizationId);
    if (!membership?.organization) {
      return NextResponse.json({ error: "You are not a member of this organization." }, { status: 403 });
    }

    if (membership.organization.status === "SUSPENDED" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "This organization is suspended." }, { status: 403 });
    }

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as "SUPER_ADMIN" | "CUSTOMER_ADMIN" | "MAILBOX_USER",
      organizationId: membership.organization.id,
      organizationSlug: membership.organization.slug,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: membership.organization.id,
      action: "ORGANIZATION_CONTEXT_SWITCHED",
      resourceType: "Organization",
      resourceId: membership.organization.id,
    });

    const response = NextResponse.json({
      message: "Organization context updated.",
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    });

    return attachSessionCookie(response, token);
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
