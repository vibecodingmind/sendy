import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { getPaymentProvider } from "@/lib/billing/PaymentProvider";
import { logAuditEvent } from "@/lib/audit";
import { getAppSettings } from "@/lib/config";
import { isProduction } from "@/lib/env/production";

export async function POST(req: NextRequest) {
  try {
    const { organization, user } = await requireTenantContext();
    const body = await req.json();
    const { planId, phoneNumber, mobileProvider } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required." }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return NextResponse.json({ error: "Selected plan not found." }, { status: 404 });
    }

    const settings = await getAppSettings();
    const provider = await getPaymentProvider();

    if (isProduction() && provider.providerName === "mock") {
      return NextResponse.json(
        { error: "Payment processing is not configured for production." },
        { status: 503 }
      );
    }

    // If using mock provider, directly upgrade subscription for seamless demo flow
    if (provider.providerName === "mock") {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        create: {
          organizationId: organization.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: nextMonth,
          paymentProvider: "mock",
        },
        update: {
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodEnd: nextMonth,
        },
      });

      // Generate invoice
      const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.invoice.create({
        data: {
          organizationId: organization.id,
          invoiceNumber,
          amountCents: plan.priceMonthlyCents,
          currency: "USD",
          status: "PAID",
          dueDate: new Date(),
          paidAt: new Date(),
        },
      });

      await logAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        organizationId: organization.id,
        action: "SUBSCRIPTION_ACTIVATED",
        resourceType: "Subscription",
        metadata: { plan: plan.name, amountCents: plan.priceMonthlyCents },
      });

      return NextResponse.json({
        success: true,
        message: `Plan upgraded to ${plan.name} successfully!`,
        checkoutUrl: `${settings.appUrl}/billing?status=success`,
      });
    }

    // Stripe Flow
    const checkout = await provider.createCheckoutSession({
      organizationId: organization.id,
      planId: plan.id,
      planName: plan.name,
      amountCents: plan.priceMonthlyCents,
      successUrl: `${settings.appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancelUrl: `${settings.appUrl}/billing?status=cancelled`,
      phoneNumber,
      mobileProvider,
    });

    return NextResponse.json(checkout);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
