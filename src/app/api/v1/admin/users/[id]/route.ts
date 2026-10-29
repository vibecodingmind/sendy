import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { hashUserPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
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
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();

    const {
      firstName,
      lastName,
      email,
      role,
      isActive,
      emailVerified,
      newPassword,
    } = body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data: any = {};

    if (firstName !== undefined) {
      data.firstName = firstName?.trim() || null;
    }

    if (lastName !== undefined) {
      data.lastName = lastName?.trim() || null;
    }

    if (email !== undefined && email.trim() !== targetUser.email) {
      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
      }

      const existing = await prisma.user.findFirst({
        where: { email: cleanEmail, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another account is already using this email address." },
          { status: 400 }
        );
      }

      data.email = cleanEmail;
    }

    if (role !== undefined) {
      const allowedRoles = ["SUPER_ADMIN", "CUSTOMER_ADMIN", "MAILBOX_USER"];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: "Invalid user role specified." }, { status: 400 });
      }
      data.role = role;
    }

    if (isActive !== undefined) {
      data.isActive = Boolean(isActive);
    }

    if (emailVerified !== undefined) {
      data.emailVerified = emailVerified ? new Date() : null;
    }

    if (newPassword !== undefined && newPassword.trim() !== "") {
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      data.passwordHash = await hashUserPassword(newPassword.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
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
        updatedAt: true,
      },
    });

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: "ADMIN_USER_UPDATED",
      resourceType: "User",
      resourceId: updated.id,
      metadata: {
        fieldsUpdated: Object.keys(data),
        targetEmail: updated.email,
      },
    });

    return NextResponse.json({
      message: "User account updated successfully.",
      user: updated,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
