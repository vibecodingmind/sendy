import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { signVerificationToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Your email address is already verified.",
        alreadyVerified: true,
      });
    }

    const token = signVerificationToken({ userId: user.id, email: user.email });
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3010";
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");
    const baseUrl = appUrl || `${proto}://${host}`;
    const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    return NextResponse.json({
      message: "Verification link generated successfully.",
      verificationUrl,
      alreadyVerified: false,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
