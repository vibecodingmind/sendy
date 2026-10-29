import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashUserPassword } from "@/lib/auth/password";
import { logAuditEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    if (resetRecord.usedAt) {
      return NextResponse.json({ error: "This reset token has already been used" }, { status: 400 });
    }

    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 404 });
    }

    // Hash new password
    const newPasswordHash = await hashUserPassword(password);

    // Update user password and invalidate token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "PASSWORD_RESET_COMPLETED",
      resourceType: "User",
      resourceId: user.id,
      metadata: { email: user.email },
    });

    return NextResponse.json({
      message: "Password has been successfully updated. You may now log in.",
    });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
