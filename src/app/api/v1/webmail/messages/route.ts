import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { sendEmail } from "@/lib/notifications/email";
import { OutboundRateLimiter } from "@/lib/mail/RateLimiter";
import { AbuseProtection } from "@/lib/abuse";

export async function GET(request: NextRequest) {
  try {
    const { organization } = await requireTenantContext();
    const { searchParams } = new URL(request.url);
    const mailboxId = searchParams.get("mailboxId");
    const folder = searchParams.get("folder") || "INBOX";
    const search = searchParams.get("search") || "";

    if (!mailboxId) {
      return NextResponse.json({ error: "mailboxId is required" }, { status: 400 });
    }

    // Verify mailbox belongs to tenant
    const mailbox = await prisma.mailbox.findFirst({
      where: { id: mailboxId, organizationId: organization.id },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
    }

    const whereClause: any = {
      mailboxId,
      folder: folder.toUpperCase(),
    };

    if (search.trim()) {
      whereClause.OR = [
        { subject: { contains: search } },
        { sender: { contains: search } },
        { recipient: { contains: search } },
        { bodyText: { contains: search } },
      ];
    }

    const messages = await prisma.webmailMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Compute counts across folders
    const [inboxTotal, inboxUnread, sentTotal, draftsTotal, trashTotal] = await Promise.all([
      prisma.webmailMessage.count({ where: { mailboxId, folder: "INBOX" } }),
      prisma.webmailMessage.count({ where: { mailboxId, folder: "INBOX", isRead: false } }),
      prisma.webmailMessage.count({ where: { mailboxId, folder: "SENT" } }),
      prisma.webmailMessage.count({ where: { mailboxId, folder: "DRAFTS" } }),
      prisma.webmailMessage.count({ where: { mailboxId, folder: "TRASH" } }),
    ]);

    return NextResponse.json({
      messages,
      folderCounts: {
        INBOX: { total: inboxTotal, unread: inboxUnread },
        SENT: { total: sentTotal, unread: 0 },
        DRAFTS: { total: draftsTotal, unread: 0 },
        TRASH: { total: trashTotal, unread: 0 },
      },
    });
  } catch (err: any) {
    if (err.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organization } = await requireTenantContext();
    const body = await request.json();
    const { mailboxId, to, subject, bodyText, bodyHtml } = body;

    if (!mailboxId || !to || !subject || !bodyText) {
      return NextResponse.json(
        { error: "Mailbox, recipient, subject, and content are required." },
        { status: 400 }
      );
    }

    const senderMailbox = await prisma.mailbox.findFirst({
      where: { id: mailboxId, organizationId: organization.id },
    });

    if (!senderMailbox) {
      return NextResponse.json({ error: "Sender mailbox not found" }, { status: 404 });
    }

    if (senderMailbox.status !== "ACTIVE") {
      return NextResponse.json({ error: "This mailbox is suspended." }, { status: 403 });
    }

    const abuseCheck = await AbuseProtection.checkOutboundRateLimit(senderMailbox.email);
    if (!abuseCheck.allowed) {
      return NextResponse.json({ error: abuseCheck.reason || "Sending is not allowed." }, { status: 403 });
    }

    const hourlyLimit = parseInt(process.env.MAX_HOURLY_EMAILS_PER_MAILBOX || "100", 10);
    const rate = await OutboundRateLimiter.checkAndIncrement(senderMailbox.id, hourlyLimit);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Hourly sending limit reached (${rate.limit}/hour). Try again in ${rate.resetInMinutes} minutes.`,
        },
        { status: 429 }
      );
    }

    const cleanTo = to.trim().toLowerCase();
    const senderName = senderMailbox.firstName
      ? `${senderMailbox.firstName} ${senderMailbox.lastName || ""}`.trim()
      : senderMailbox.email;
    const formattedSender = `${senderName} <${senderMailbox.email}>`;

    // 1. Save in Sender's SENT folder
    const sentMessage = await prisma.webmailMessage.create({
      data: {
        mailboxId: senderMailbox.id,
        folder: "SENT",
        sender: formattedSender,
        senderEmail: senderMailbox.email,
        recipient: cleanTo,
        recipientEmail: cleanTo,
        subject: subject.trim(),
        bodyText: bodyText.trim(),
        bodyHtml: bodyHtml || `<p style="font-family: sans-serif; white-space: pre-wrap;">${bodyText.trim()}</p>`,
        isRead: true,
        isStarred: false,
        sizeBytes: bodyText.length + 512,
      },
    });

    // 2. Local Delivery Simulation: If recipient email exists in our platform, deliver straight to their INBOX!
    const recipientMailbox = await prisma.mailbox.findUnique({
      where: { email: cleanTo },
    });

    if (recipientMailbox) {
      await prisma.webmailMessage.create({
        data: {
          mailboxId: recipientMailbox.id,
          folder: "INBOX",
          sender: formattedSender,
          senderEmail: senderMailbox.email,
          recipient: recipientMailbox.email,
          recipientEmail: recipientMailbox.email,
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          bodyHtml: bodyHtml || `<p style="font-family: sans-serif; white-space: pre-wrap;">${bodyText.trim()}</p>`,
          isRead: false,
          isStarred: false,
          sizeBytes: bodyText.length + 512,
        },
      });

      // Update recipient mailbox used storage
      await prisma.mailbox.update({
        where: { id: recipientMailbox.id },
        data: {
          usedStorageBytes: {
            increment: BigInt(bodyText.length + 512),
          },
        },
      });
    } else {
      // External recipient: route via transactional SMTP dispatcher if configured
      await sendEmail({
        to: cleanTo,
        subject: subject.trim(),
        text: bodyText.trim(),
        html: bodyHtml || `<p>${bodyText.trim()}</p>`,
      });
    }

    // Update sender storage
    await prisma.mailbox.update({
      where: { id: senderMailbox.id },
      data: {
        usedStorageBytes: {
          increment: BigInt(bodyText.length + 512),
        },
      },
    });

    return NextResponse.json({ success: true, message: sentMessage }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
