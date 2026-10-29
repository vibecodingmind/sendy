import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyVerificationToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const payload = verifyVerificationToken(token);
    if (!payload || !payload.userId || !payload.email) {
      return NextResponse.json(
        { error: "The verification link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: "Associated user account was not found." }, { status: 404 });
    }

    // Verify and update user
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        // If the token was issued for a new email, make sure email matches
        email: payload.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully!",
      user: updated,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal error during verification" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect to verify-email landing page to render clean UI
  return NextResponse.redirect(new URL(`/verify-email?token=${encodeURIComponent(token)}`, req.url));
}
