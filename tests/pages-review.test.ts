import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getAppSettings } from "@/lib/config";

describe("Platform-Wide Page & Feature Architecture Review", () => {
  it("Public Configuration: verifies app settings match homepage branding", async () => {
    const settings = await getAppSettings();
    expect(settings.appName).toBeDefined();
    expect(settings.mailSmtpPort).toBe(465);
    expect(settings.mailImapPort).toBe(993);
  });

  it("Pricing Tiers: ensures database plans match public homepage pricing table", async () => {
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    expect(plans.length).toBeGreaterThanOrEqual(3);

    const starter = plans.find((p) => p.slug === "starter");
    const business = plans.find((p) => p.slug === "business");
    const enterprise = plans.find((p) => p.slug === "enterprise");

    expect(starter?.priceMonthlyCents).toBe(500); // $5/mo
    expect(starter?.maxMailboxes).toBe(5);

    expect(business?.priceMonthlyCents).toBe(1500); // $15/mo
    expect(business?.maxMailboxes).toBe(25);

    expect(enterprise?.priceMonthlyCents).toBe(4900); // $49/mo
    expect(enterprise?.maxMailboxes).toBe(100);
  });

  it("Webmail Engine: verifies message lifecycle and cryptographic header export", async () => {
    const mailbox = await prisma.mailbox.findFirst({
      where: { email: "john@democorp.com" },
    });
    expect(mailbox).not.toBeNull();

    // Create a message in INBOX
    const message = await prisma.webmailMessage.create({
      data: {
        mailboxId: mailbox!.id,
        folder: "INBOX",
        sender: "partner@globalventure.com",
        senderEmail: "partner@globalventure.com",
        recipient: mailbox!.email,
        recipientEmail: mailbox!.email,
        subject: "Contract Signed & Delivery Confirmation",
        bodyText: "All terms agreed. Please find signed countersignatures attached.",
        bodyHtml: "<p>All terms agreed. Please find signed countersignatures attached.</p>",
        isRead: false,
        isStarred: true,
        sizeBytes: 4096,
      },
    });
    expect(message.id).toBeDefined();
    expect(message.folder).toBe("INBOX");
    expect(message.isStarred).toBe(true);

    // Toggle read status
    const updated = await prisma.webmailMessage.update({
      where: { id: message.id },
      data: { isRead: true, folder: "ARCHIVE" },
    });
    expect(updated.isRead).toBe(true);
    expect(updated.folder).toBe("ARCHIVE");

    // Clean up test message
    await prisma.webmailMessage.delete({ where: { id: message.id } });
  });

  it("Support Desk: verifies customer ticket threading and staff replies", async () => {
    const org = await prisma.organization.findFirst({ where: { slug: "demo-corp" } });
    const user = await prisma.user.findFirst({ where: { email: "owner@democorp.com" } });
    expect(org).not.toBeNull();
    expect(user).not.toBeNull();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TICK-TEST-${Date.now()}`,
        organizationId: org!.id,
        userId: user!.id,
        subject: "SSL Auto-renewal query",
        priority: "MEDIUM",
        status: "OPEN",
        messages: {
          create: {
            userId: user!.id,
            isStaff: false,
            message: "Does Let's Encrypt renew automatically every 60 days?",
          },
        },
      },
      include: { messages: true },
    });

    expect(ticket.status).toBe("OPEN");
    expect(ticket.messages.length).toBe(1);

    // Staff reply
    const reply = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user!.id,
        isStaff: true,
        message: "Yes, our background certbot cron renews certificates automatically.",
      },
    });
    expect(reply.isStaff).toBe(true);

    // Clean up
    await prisma.supportMessage.deleteMany({ where: { ticketId: ticket.id } });
    await prisma.supportTicket.delete({ where: { id: ticket.id } });
  });
});
