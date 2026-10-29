import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyUserPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";
import { verifyTotpCode } from "@/lib/auth/totp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, twoFactorCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = await verifyUserPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Two-Factor Authentication Challenge
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        return NextResponse.json({
          requiresTwoFactor: true,
          message: "Two-factor authentication code required.",
        });
      }

      const cleanCode = String(twoFactorCode).trim();
      let is2faValid = verifyTotpCode(user.twoFactorSecret, cleanCode);

      // If TOTP check fails, check single-use recovery backup codes
      if (!is2faValid && user.twoFactorBackupCodes) {
        try {
          const backupCodes: string[] = JSON.parse(user.twoFactorBackupCodes);
          const index = backupCodes.indexOf(cleanCode.toLowerCase());
          if (index !== -1) {
            is2faValid = true;
            // Consume used backup code
            backupCodes.splice(index, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
            });
          }
        } catch {
          // ignore
        }
      }

      if (!is2faValid) {
        return NextResponse.json(
          { error: "Invalid two-factor authentication or backup recovery code." },
          { status: 401 }
        );
      }
    }

    const primaryOrg = user.memberships[0]?.organization;

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role as "SUPER_ADMIN" | "CUSTOMER_ADMIN" | "MAILBOX_USER",
      organizationId: primaryOrg?.id,
      organizationSlug: primaryOrg?.slug,
    });

    // Record active session
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Web Browser";

    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: token,
        ipAddress,
        userAgent,
        lastActiveAt: new Date(),
      },
    }).catch(() => {});

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: primaryOrg?.id,
      action: "USER_LOGGED_IN",
      resourceType: "User",
      resourceId: user.id,
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: primaryOrg
        ? {
            id: primaryOrg.id,
            name: primaryOrg.name,
            slug: primaryOrg.slug,
          }
        : null,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during login." },
      { status: 500 }
    );
  }
}
