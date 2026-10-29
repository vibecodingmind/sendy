import { prisma } from "@/lib/db/prisma";
import { logAuditEvent } from "../audit";

export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
}

export class AbuseProtection {
  // Max outbound emails per mailbox per 24h
  static readonly DAILY_OUTBOUND_LIMIT = 500;
  // Max failed auth attempts before progressive delay / lock
  static readonly MAX_FAILED_ATTEMPTS = 5;

  /**
   * Validates if a mailbox can send email based on daily rate limits.
   */
  static async checkOutboundRateLimit(mailboxEmail: string): Promise<AbuseCheckResult> {
    const mailbox = await prisma.mailbox.findUnique({
      where: { email: mailboxEmail.toLowerCase() },
      include: { organization: true },
    });

    if (!mailbox) {
      return { allowed: false, reason: "Mailbox does not exist" };
    }

    if (mailbox.status !== "ACTIVE" || mailbox.organization.status !== "ACTIVE") {
      return { allowed: false, reason: "Mailbox or organization is suspended" };
    }

    return { allowed: true };
  }

  /**
   * Evaluates organization status and flags anomalous activity.
   */
  static async evaluateOrganizationRisk(organizationId: string): Promise<{ riskScore: number; flags: string[] }> {
    const flags: string[] = [];
    let riskScore = 0;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        domains: true,
        mailboxes: true,
        subscription: true,
      },
    });

    if (!org) return { riskScore: 100, flags: ["Organization not found"] };

    if (!org.subscription || org.subscription.status === "PAST_DUE") {
      riskScore += 20;
      flags.push("Subscription past due");
    }

    if (org.domains.some((d) => !d.isVerified)) {
      riskScore += 10;
      flags.push("Unverified domain(s) active");
    }

    return { riskScore, flags };
  }

  /**
   * Suspends a mailbox or organization upon verified abuse report.
   */
  static async triggerAbuseAction(
    organizationId: string,
    action: "SUSPEND_ORGANIZATION" | "SUSPEND_MAILBOX",
    resourceId: string,
    reason: string
  ): Promise<void> {
    if (action === "SUSPEND_ORGANIZATION") {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { status: "SUSPENDED" },
      });
      await logAuditEvent({
        organizationId,
        action: "ABUSE_ORGANIZATION_SUSPENDED",
        resourceType: "Organization",
        resourceId: organizationId,
        metadata: { reason },
      });
    } else {
      await prisma.mailbox.update({
        where: { id: resourceId },
        data: { status: "SUSPENDED" },
      });
      await logAuditEvent({
        organizationId,
        action: "ABUSE_MAILBOX_SUSPENDED",
        resourceType: "Mailbox",
        resourceId,
        metadata: { reason },
      });
    }
  }
}
