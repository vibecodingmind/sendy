import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashUserPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, organizationName } = body;

    if (!email || !password || !organizationName) {
      return NextResponse.json(
        { error: "Email, password, and organization name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate unique slug
    let slug = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) slug = "org";

    const existingSlug = await prisma.organization.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Allocate mail server
    const server = await MailServerAllocator.allocateServer();

    // Find default starter plan
    let starterPlan = await prisma.plan.findFirst({
      where: { slug: "starter", isActive: true },
    });

    if (!starterPlan) {
      starterPlan = await prisma.plan.create({
        data: {
          name: "Starter",
          slug: "starter",
          priceMonthlyCents: 500,
          maxDomains: 1,
          maxMailboxes: 5,
          maxStorageGb: 25,
          maxAliases: 10,
          maxForwarders: 10,
        },
      });
    }

    // Hash password
    const passwordHash = await hashUserPassword(password);

    // Create User, Organization, Membership, and Subscription in a transaction
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day free trial

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: firstName?.trim() || null,
          lastName: lastName?.trim() || null,
          role: "CUSTOMER_ADMIN",
          emailVerified: new Date(),
        },
      });

      const org = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          slug,
          status: "ACTIVE",
          mailServerId: server.id,
          members: {
            create: {
              userId: user.id,
              role: "CUSTOMER_ADMIN",
            },
          },
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          organizationId: org.id,
          planId: starterPlan.id,
          status: "TRIAL",
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
          paymentProvider: "mock",
        },
      });

      return { user, org, subscription };
    });

    // Sign session
    const token = signSessionToken({
      userId: result.user.id,
      email: result.user.email,
      role: "CUSTOMER_ADMIN",
      organizationId: result.org.id,
      organizationSlug: result.org.slug,
    });

    await logAuditEvent({
      actorId: result.user.id,
      actorRole: "CUSTOMER_ADMIN",
      organizationId: result.org.id,
      action: "CUSTOMER_REGISTERED",
      resourceType: "User",
      resourceId: result.user.id,
      metadata: { organizationName: result.org.name },
    });

    const response = NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
        },
      },
      { status: 201 }
    );

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
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error during registration." },
      { status: 500 }
    );
  }
}
