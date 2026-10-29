import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { isSimulatedWebmailEnabled } from "@/lib/features/flags";

/**
 * Seed starter emails into a newly initialized mailbox for immediate preview.
 */
async function seedStarterEmails(mailboxId: string, mailboxEmail: string) {
  const starterEmails = [
    {
      mailboxId,
      folder: "INBOX",
      sender: "Monogram Postmaster <postmaster@monogrammail.com>",
      senderEmail: "postmaster@monogrammail.com",
      recipient: mailboxEmail,
      recipientEmail: mailboxEmail,
      subject: "Welcome to your new business email mailbox",
      bodyText: `Hello and welcome!\n\nYour business email account (${mailboxEmail}) has been successfully provisioned and is active.\n\nYou can send and receive emails, manage folders, or connect your desktop client via IMAP/SMTP.\n\nBest regards,\nMonogram Mail Postmaster Team`,
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
        <h2 style="color: #4f46e5; margin-top: 0;">Welcome to your new business email mailbox!</h2>
        <p>Your business email account <strong>${mailboxEmail}</strong> has been provisioned on our high-performance mail cluster.</p>
        <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> Active & Ready<br/><strong>Security:</strong> TLS 1.3 Encryption Enabled</p>
        </div>
        <p>You can send and receive messages right here from Webmail, or connect your favorite desktop mail client.</p>
      </div>`,
      isRead: false,
      isStarred: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 3), // 3 hours ago
    },
    {
      mailboxId,
      folder: "INBOX",
      sender: "System Security <security@monogrammail.com>",
      senderEmail: "security@monogrammail.com",
      recipient: mailboxEmail,
      recipientEmail: mailboxEmail,
      subject: "Security Notification: Domain SPF, DKIM & DMARC Protection Active",
      bodyText: `Your corporate domain email authentication has been verified.\n\nAll outgoing messages from this account are automatically signed with a 2048-bit RSA DKIM key and protected by DMARC anti-spoofing policies.`,
      bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
        <h3 style="color: #0f172a; margin-top: 0;">Email Deliverability & Protection Active</h3>
        <p>All outgoing emails from <strong>${mailboxEmail}</strong> are secured with:</p>
        <ul>
          <li><strong>DKIM:</strong> 2048-bit cryptographic signature</li>
          <li><strong>SPF:</strong> Authorized mail relay enforcement</li>
          <li><strong>DMARC:</strong> Quarantine & anti-impersonation policy</li>
        </ul>
        <p style="color: #64748b; font-size: 13px;">Your domain reputation is actively protected.</p>
      </div>`,
      isRead: false,
      isStarred: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 1), // 1 hour ago
    },
    {
      mailboxId,
      folder: "SENT",
      sender: mailboxEmail,
      senderEmail: mailboxEmail,
      recipient: "team@partner.com",
      recipientEmail: "team@partner.com",
      subject: "Connecting our new enterprise mail server",
      bodyText: `Hey team,\n\nOur company email hosting is now officially live on Monogram Mail!\n\nBest,\n${mailboxEmail.split("@")[0]}`,
      bodyHtml: `<p>Hey team,</p><p>Our company email hosting is now officially live on Monogram Mail!</p>`,
      isRead: true,
      isStarred: false,
      createdAt: new Date(Date.now() - 3600 * 1000 * 5),
    },
  ];

  for (const email of starterEmails) {
    await prisma.webmailMessage.create({ data: email });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { organization } = await requireTenantContext();

    const mailboxes = await prisma.mailbox.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
      },
      include: {
        domain: {
          select: { name: true },
        },
        _count: {
          select: {
            messages: {
              where: { folder: "INBOX", isRead: false },
            },
          },
        },
      },
      orderBy: { email: "asc" },
    });

    let seeded = false;
    if (isSimulatedWebmailEnabled()) {
      for (const mb of mailboxes) {
        const msgCount = await prisma.webmailMessage.count({
          where: { mailboxId: mb.id },
        });
        if (msgCount === 0) {
          await seedStarterEmails(mb.id, mb.email);
          seeded = true;
        }
      }
    }

    const updatedMailboxes = seeded
      ? await prisma.mailbox.findMany({
          where: {
            organizationId: organization.id,
            status: "ACTIVE",
          },
          include: {
            domain: {
              select: { name: true },
            },
            _count: {
              select: {
                messages: {
                  where: { folder: "INBOX", isRead: false },
                },
              },
            },
          },
          orderBy: { email: "asc" },
        })
      : mailboxes;

    return NextResponse.json({
      mailboxes: updatedMailboxes.map((mb) => ({
        id: mb.id,
        email: mb.email,
        firstName: mb.firstName,
        lastName: mb.lastName,
        domain: mb.domain.name,
        storageLimitMb: mb.storageLimitMb,
        usedStorageBytes: Number(mb.usedStorageBytes),
        unreadCount: mb._count.messages,
      })),
    });
  } catch (err: any) {
    if (err.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch mailboxes" }, { status: 500 });
  }
}
