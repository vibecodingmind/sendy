import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { verifyUserPassword } from "@/lib/auth/password";
import {
  generateTotpSecret,
  generateBackupCodes,
  getOtpAuthUri,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const { user: authUser } = await requireTenantContext();

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      let backupCount = 0;
      try {
        if (user.twoFactorBackupCodes) {
          backupCount = JSON.parse(user.twoFactorBackupCodes).length;
        }
      } catch {
        backupCount = 0;
      }

      return NextResponse.json({
        enabled: true,
        backupCodesRemaining: backupCount,
      });
    }

    // Generate fresh secret & backup codes for setup
    const secret = generateTotpSecret();
    const backupCodes = generateBackupCodes(8);
    const otpauthUri = getOtpAuthUri(user.email, secret);

    return NextResponse.json({
      enabled: false,
      secret,
      otpauthUri,
      backupCodes,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser, organization } = await requireTenantContext();
    const body = await req.json();
    const { secret, code, backupCodes } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { error: "Secret and 6-digit code are required." },
        { status: 400 }
      );
    }

    const isValid = verifyTotpCode(secret, String(code).trim());
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code. Please ensure your device clock is accurate." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorBackupCodes: JSON.stringify(backupCodes || []),
      },
    });

    await logAuditEvent({
      actorId: authUser.id,
      actorRole: authUser.role,
      organizationId: organization?.id,
      action: "USER_TWO_FACTOR_ENABLED",
      resourceType: "User",
      resourceId: authUser.id,
    });

    return NextResponse.json({
      message: "Two-factor authentication has been successfully enabled!",
      enabled: true,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user: authUser, organization } = await requireTenantContext();
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Current password is required to disable 2FA." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await verifyUserPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password. Cannot disable two-factor authentication." },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization?.id,
      action: "USER_TWO_FACTOR_DISABLED",
      resourceType: "User",
      resourceId: user.id,
    });

    return NextResponse.json({
      message: "Two-factor authentication has been disabled.",
      enabled: false,
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
