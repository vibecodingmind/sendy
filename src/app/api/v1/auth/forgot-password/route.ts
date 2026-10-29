import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/notifications/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // We generate token and save it
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

      await prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token,
          expiresAt,
        },
      });

      const origin = request.nextUrl.origin;
      const resetUrl = `${origin}/reset-password?token=${token}`;

      // Dispatch transactional email
      await sendPasswordResetEmail(user.email, resetUrl);

      // If in local/dev mode, return resetUrl in response for easy testing
      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json({
        message: "If an account exists with this email, a password reset link has been sent.",
        ...(isDev ? { debugResetUrl: resetUrl } : {}),
      });
    }

    // Return identical message to prevent user enumeration attacks
    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (err: any) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Failed to process password reset request" }, { status: 500 });
  }
}
