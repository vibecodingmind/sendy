import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";
import { assertCronAuthorized } from "@/lib/http/cronAuth";

/**
 * Background Cron Job: Mailbox Quota & Storage Sync.
 * Polls Dovecot / mail provider storage usage and updates local SaaS database metrics.
 */
export async function POST(request: NextRequest) {
  try {
    const cronDenied = assertCronAuthorized(request);
    if (cronDenied) {
      return cronDenied;
    }

    const organizations = await prisma.organization.findMany({
      where: { status: "ACTIVE" },
      include: {
        domains: {
          include: {
            mailboxes: true,
          },
        },
      },
    });

    let updatedMailboxesCount = 0;

    for (const org of organizations) {
      let orgTotalBytes = BigInt(0);
      let mailboxCount = 0;

      for (const domain of org.domains) {
        const provider = await MailServerAllocator.getProviderForOrganization(org.id);

        for (const mailbox of domain.mailboxes) {
          try {
            const usage = await provider.getMailboxUsage(mailbox.email);
            const usedBytes = BigInt(usage.usedBytes);

            await prisma.mailbox.update({
              where: { id: mailbox.id },
              data: { usedStorageBytes: usedBytes },
            });

            orgTotalBytes += usedBytes;
            mailboxCount++;
            updatedMailboxesCount++;
          } catch {
            // Keep existing quota if probe fails
            orgTotalBytes += mailbox.usedStorageBytes;
          }
        }
      }

      // Record aggregated daily usage snapshot
      await prisma.usageRecord.create({
        data: {
          organizationId: org.id,
          totalStorageBytes: orgTotalBytes,
          totalMailboxes: mailboxCount,
          totalDomains: org.domains.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      updatedMailboxesCount,
      organizationsProcessed: organizations.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Quota sync cron error:", err);
    return NextResponse.json({ error: "Quota sync failed", details: err.message }, { status: 500 });
  }
}
