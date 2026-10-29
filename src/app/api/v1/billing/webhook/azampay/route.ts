import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  isPaymentTransactionProcessed,
  verifyAzamPayWebhook,
} from "@/lib/billing/webhookSecurity";
import { isProduction } from "@/lib/env/production";

/**
 * AzamPay Webhook / Callback Handler
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAzamPayWebhook(request)) {
      return NextResponse.json({ error: "Unauthorized callback" }, { status: 401 });
    }

    const body = await request.json();

    const rawStatus =
      body.transactionstatus ||
      body.transactionStatus ||
      (body.success === true ? "success" : body.success === false ? "failed" : "");
    const status = String(rawStatus).toLowerCase();
    const transactionId = body.transactionId || body.transactionid;
    const txRef = body.externalId || body.reference || body.utilityref || transactionId;
    const orgId = body.additionalProperties?.organizationId;
    const planId = body.additionalProperties?.planId;
    const originalAmountCents = body.additionalProperties?.amountCents;

    if (status === "success" && orgId && planId) {
      if (transactionId && (await isPaymentTransactionProcessed("azampay", String(transactionId)))) {
        return NextResponse.json({ received: true, duplicate: true });
      }

      const [organization, plan] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: orgId },
          include: { subscription: true },
        }),
        prisma.plan.findUnique({ where: { id: planId } }),
      ]);

      if (!organization || !plan) {
        console.error(`[AzamPay Webhook] Organization or Plan not found: org=${orgId}, plan=${planId}`);
        return NextResponse.json({ received: true, warning: "Organization or plan not found" });
      }

      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      let subscriptionRecord = organization.subscription;

      if (organization.subscription) {
        subscriptionRecord = await prisma.subscription.update({
          where: { id: organization.subscription.id },
          data: {
            planId: plan.id,
            status: "ACTIVE",
            paymentProvider: "azampay",
            providerSubscriptionId: transactionId || txRef,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
      } else {
        subscriptionRecord = await prisma.subscription.create({
          data: {
            organizationId: organization.id,
            planId: plan.id,
            status: "ACTIVE",
            paymentProvider: "azampay",
            providerSubscriptionId: transactionId || txRef,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });
      }

      const invoiceNumber = `INV-AZ-${Date.now().toString(36).toUpperCase()}`;
      const invoice = await prisma.invoice.create({
        data: {
          organizationId: organization.id,
          subscriptionId: subscriptionRecord.id,
          invoiceNumber,
          amountCents: originalAmountCents || plan.priceMonthlyCents,
          currency: "TZS",
          status: "PAID",
          dueDate: periodEnd,
          paidAt: new Date(),
        },
      });

      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amountCents: originalAmountCents || plan.priceMonthlyCents,
          currency: "TZS",
          provider: "azampay",
          providerTransactionId: transactionId || txRef || `az_${Date.now()}`,
          status: "SUCCEEDED",
        },
      });

      await prisma.organization.update({
        where: { id: organization.id },
        data: { status: "ACTIVE" },
      });

      await logAuditEvent({
        organizationId: organization.id,
        action: "AZAMPAY_PAYMENT_SUCCESS",
        resourceType: "Subscription",
        resourceId: transactionId,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          amount: body.amount,
          operator: body.operator,
          externalId: txRef,
        },
      });
    } else if (status === "failed" && orgId) {
      await logAuditEvent({
        organizationId: orgId,
        action: "AZAMPAY_PAYMENT_FAILED",
        resourceType: "Payment",
        metadata: {
          message: body.message,
          operator: body.operator,
          externalId: txRef,
          amount: body.amount,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("[AzamPay Webhook] Error:", message);
    return NextResponse.json(
      { error: isProduction() ? "Webhook handler failed" : message },
      { status: 500 }
    );
  }
}
