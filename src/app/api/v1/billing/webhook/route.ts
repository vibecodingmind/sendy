import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  isPaymentTransactionProcessed,
  verifyStripeWebhookSignature,
} from "@/lib/billing/webhookSecurity";
import { isProduction } from "@/lib/env/production";

/**
 * Stripe Webhook Handler.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!verifyStripeWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid or missing Stripe signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id as string | undefined;

    if (eventId) {
      const prior = await prisma.auditLog.findFirst({
        where: {
          action: "STRIPE_WEBHOOK_EVENT",
          resourceId: eventId,
        },
      });
      if (prior) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const organizationId = session.client_reference_id;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const stripePaymentId = session.payment_intent || session.id;

        if (organizationId) {
          if (stripePaymentId && (await isPaymentTransactionProcessed("stripe", String(stripePaymentId)))) {
            break;
          }

          const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: { subscription: true },
          });

          if (organization) {
            const plan = await prisma.plan.findFirst({
              where: { isActive: true, priceMonthlyCents: { gt: 0 } },
              orderBy: { priceMonthlyCents: "asc" },
            });

            if (plan) {
              const periodStart = new Date();
              const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

              let subscriptionRecord = organization.subscription;

              if (organization.subscription) {
                subscriptionRecord = await prisma.subscription.update({
                  where: { id: organization.subscription.id },
                  data: {
                    planId: plan.id,
                    status: "ACTIVE",
                    paymentProvider: "stripe",
                    providerSubscriptionId: subscriptionId || `sub_${Date.now()}`,
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
                    paymentProvider: "stripe",
                    providerSubscriptionId: subscriptionId || `sub_${Date.now()}`,
                    currentPeriodStart: periodStart,
                    currentPeriodEnd: periodEnd,
                  },
                });
              }

              const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
              const invoice = await prisma.invoice.create({
                data: {
                  organizationId: organization.id,
                  subscriptionId: subscriptionRecord.id,
                  invoiceNumber,
                  amountCents: session.amount_total || plan.priceMonthlyCents,
                  currency: session.currency?.toUpperCase() || "USD",
                  status: "PAID",
                  dueDate: periodEnd,
                  paidAt: new Date(),
                },
              });

              if (stripePaymentId) {
                await prisma.payment.create({
                  data: {
                    invoiceId: invoice.id,
                    amountCents: session.amount_total || plan.priceMonthlyCents,
                    currency: session.currency?.toUpperCase() || "USD",
                    provider: "stripe",
                    providerTransactionId: String(stripePaymentId),
                    status: "SUCCEEDED",
                  },
                });
              }

              await prisma.organization.update({
                where: { id: organization.id },
                data: { status: "ACTIVE" },
              });

              await logAuditEvent({
                organizationId: organization.id,
                action: "SUBSCRIPTION_ACTIVATED_WEBHOOK",
                resourceType: "Subscription",
                resourceId: subscriptionId,
                metadata: { planId: plan.id, customerId },
              });
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoiceObj = event.data.object;
        const subscriptionId = invoiceObj.subscription;
        const stripeTxn = invoiceObj.payment_intent || invoiceObj.id;

        if (subscriptionId) {
          if (stripeTxn && (await isPaymentTransactionProcessed("stripe", String(stripeTxn)))) {
            break;
          }

          const sub = await prisma.subscription.findFirst({
            where: { providerSubscriptionId: subscriptionId },
          });

          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: "ACTIVE",
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });

            const invoice = await prisma.invoice.create({
              data: {
                organizationId: sub.organizationId,
                subscriptionId: sub.id,
                invoiceNumber: invoiceObj.number || `INV-${Date.now().toString(36).toUpperCase()}`,
                amountCents: invoiceObj.amount_paid || 0,
                currency: invoiceObj.currency?.toUpperCase() || "USD",
                status: "PAID",
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                paidAt: new Date(),
              },
            });

            if (stripeTxn) {
              await prisma.payment.create({
                data: {
                  invoiceId: invoice.id,
                  amountCents: invoiceObj.amount_paid || 0,
                  currency: invoiceObj.currency?.toUpperCase() || "USD",
                  provider: "stripe",
                  providerTransactionId: String(stripeTxn),
                  status: "SUCCEEDED",
                },
              });
            }

            await logAuditEvent({
              organizationId: sub.organizationId,
              action: "INVOICE_PAID_WEBHOOK",
              resourceType: "Invoice",
              metadata: { amount: invoiceObj.amount_paid },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoiceObj = event.data.object;
        const subscriptionId = invoiceObj.subscription;

        if (subscriptionId) {
          const sub = await prisma.subscription.findFirst({
            where: { providerSubscriptionId: subscriptionId },
          });

          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: "PAST_DUE" },
            });

            await logAuditEvent({
              organizationId: sub.organizationId,
              action: "INVOICE_PAYMENT_FAILED_WEBHOOK",
              resourceType: "Invoice",
              metadata: { failureMessage: invoiceObj.last_payment_error?.message },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subObj = event.data.object;
        const subscriptionId = subObj.id;

        const sub = await prisma.subscription.findFirst({
          where: { providerSubscriptionId: subscriptionId },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELLED",
              cancelAtPeriodEnd: false,
            },
          });

          await logAuditEvent({
            organizationId: sub.organizationId,
            action: "SUBSCRIPTION_CANCELLED_WEBHOOK",
            resourceType: "Subscription",
            resourceId: subscriptionId,
          });
        }
        break;
      }

      default:
        break;
    }

    if (eventId) {
      await logAuditEvent({
        action: "STRIPE_WEBHOOK_EVENT",
        resourceType: "StripeEvent",
        resourceId: eventId,
        metadata: { type: event.type },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("Stripe Webhook error:", err);
    return NextResponse.json(
      { error: isProduction() ? "Webhook handler failed" : message },
      { status: 500 }
    );
  }
}
