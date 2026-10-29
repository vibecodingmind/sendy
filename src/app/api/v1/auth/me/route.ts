import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, requireTenantContext } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { verifyUserPassword, hashUserPassword } from "@/lib/auth/password";
import { signVerificationToken } from "@/lib/auth/jwt";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: session.userId },
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
        memberships: {
          include: {
            organization: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        },
      },
    });

    if (!fullUser || !fullUser.isActive) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const organizations =
      fullUser.memberships?.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        status: m.organization.status,
      })) || [];

    const { memberships: _memberships, ...userProfile } = fullUser;

    if (session.role === "SUPER_ADMIN" && organizations.length === 0) {
      return NextResponse.json({
        authenticated: true,
        user: userProfile,
        organization: null,
        organizations: [],
        activeOrganizationId: session.organizationId || null,
      });
    }

    const tenantContext = await requireTenantContext();
    return NextResponse.json({
      authenticated: true,
      user: userProfile,
      organization: tenantContext.organization,
      subscription: tenantContext.subscription,
      organizations,
      activeOrganizationId: session.organizationId || tenantContext.organization.id,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User account not found or suspended." }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email, currentPassword, newPassword } = body;

    const data: any = {};

    if (firstName !== undefined) {
      data.firstName = firstName?.trim() || null;
    }

    if (lastName !== undefined) {
      data.lastName = lastName?.trim() || null;
    }

    let emailChanged = false;
    if (email !== undefined && email.trim() !== user.email) {
      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }

      const existing = await prisma.user.findFirst({
        where: { email: cleanEmail, NOT: { id: user.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Email address is already in use by another account." }, { status: 400 });
      }

      data.email = cleanEmail;
      data.emailVerified = null; // Require re-verification
      emailChanged = true;
    }

    // Password change
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password." }, { status: 400 });
      }

      const isCurrentValid = await verifyUserPassword(currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }

      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters long." }, { status: 400 });
      }

      data.passwordHash = await hashUserPassword(newPassword.trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
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
      },
    });

    let verificationUrl: string | undefined;
    if (emailChanged) {
      const token = signVerificationToken({ userId: updatedUser.id, email: updatedUser.email });
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3010";
      const appUrl = process.env.APP_URL?.replace(/\/$/, "");
      const baseUrl = appUrl || `${proto}://${host}`;
      verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    }

    return NextResponse.json({
      message: "Profile updated successfully.",
      user: updatedUser,
      emailChanged,
      verificationUrl,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
