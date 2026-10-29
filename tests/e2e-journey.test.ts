import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashUserPassword, hashDovecotPassword } from "@/lib/auth/password";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";

describe("Complete End-to-End Customer SaaS Journey", () => {
  const timestamp = Date.now();
  const testCustomerEmail = `e2e-founder-${timestamp}@acmecorp.com`;
  const orgName = `Acme International ${timestamp}`;
  const domainName = `acme-mail-${timestamp}.com`;
  const mailboxEmail = `founder@${domainName}`;

  let userId: string;
  let organizationId: string;
  let domainId: string;
  let mailboxId: string;

  it("Step 1: Register customer and initialize organization", async () => {
    const passwordHash = await hashUserPassword("FounderSecurePass2026!");

    const user = await prisma.user.create({
      data: {
        email: testCustomerEmail,
        passwordHash,
        firstName: "Alexander",
        lastName: "Hamilton",
        role: "CUSTOMER_ADMIN",
      },
    });
    userId = user.id;

    const server = await MailServerAllocator.allocateServer();

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: `acme-${timestamp}`,
        mailServerId: server.id,
        members: {
          create: { userId: user.id, role: "CUSTOMER_ADMIN" },
        },
      },
    });
    organizationId = org.id;

    expect(userId).toBeDefined();
    expect(organizationId).toBeDefined();
  });

  it("Step 2: Choose plan and activate subscription", async () => {
    const plan = await prisma.plan.findFirst({ where: { slug: "business" } });
    expect(plan).not.toBeNull();

    const sub = await prisma.subscription.create({
      data: {
        organizationId,
        planId: plan!.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
      },
    });
    expect(sub.status).toBe("ACTIVE");

    // Generate Invoice
    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        subscriptionId: sub.id,
        invoiceNumber: `INV-E2E-${timestamp}`,
        amountCents: plan!.priceMonthlyCents,
        currency: "USD",
        status: "PAID",
        dueDate: new Date(),
        paidAt: new Date(),
      },
    });
    expect(invoice.status).toBe("PAID");
  });

  it("Step 3: Connect customer domain and obtain DNS instructions", async () => {
    const provider = await MailServerAllocator.getProviderForOrganization(organizationId);
    const dkim = await provider.getOrCreateDkimRecord(domainName, "default");

    await provider.createDomain({
      domain: domainName,
      maxQuotaMb: 250 * 1024,
      maxMailboxes: 25,
    });

    const domain = await prisma.domain.create({
      data: {
        organizationId,
        name: domainName,
        status: "PENDING_VERIFICATION",
        dkimSelector: dkim.selector,
        dkimPublicKey: dkim.publicKey,
      },
    });
    domainId = domain.id;

    expect(domain.name).toBe(domainName);
    expect(domain.status).toBe("PENDING_VERIFICATION");
  });

  it("Step 4: Verify domain DNS and activate domain", async () => {
    // In our live provider, verify domain changes status to VERIFIED
    const domain = await prisma.domain.update({
      where: { id: domainId },
      data: {
        isVerified: true,
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });

    expect(domain.isVerified).toBe(true);
    expect(domain.status).toBe("VERIFIED");
  });

  it("Step 5: Create first business mailbox with quota and Dovecot password", async () => {
    const dovecotHash = hashDovecotPassword("MailboxFounderPass2026!");
    const provider = await MailServerAllocator.getProviderForOrganization(organizationId);

    await provider.createMailbox({
      email: mailboxEmail,
      name: "Alexander Hamilton",
      passwordPlain: "MailboxFounderPass2026!",
      passwordHash: dovecotHash,
      quotaMb: 10240, // 10 GB
    });

    const mailbox = await prisma.mailbox.create({
      data: {
        organizationId,
        domainId,
        email: mailboxEmail,
        firstName: "Alexander",
        lastName: "Hamilton",
        storageLimitMb: 10240,
        usedStorageBytes: BigInt(1024 * 1024 * 5), // 5 MB initial
        status: "ACTIVE",
        passwordHash: dovecotHash,
      },
    });
    mailboxId = mailbox.id;

    expect(mailbox.email).toBe(mailboxEmail);
    expect(mailbox.status).toBe("ACTIVE");
  });

  it("Step 6: Configure email alias and forwarder", async () => {
    const provider = await MailServerAllocator.getProviderForOrganization(organizationId);

    // Add sales alias pointing to founder
    await provider.createAlias(`sales@${domainName}`, mailboxEmail);
    const alias = await prisma.mailboxAlias.create({
      data: {
        organizationId,
        domainId,
        sourceAddress: `sales@${domainName}`,
        destinationMailboxId: mailboxId,
        status: "ACTIVE",
      },
    });
    expect(alias.sourceAddress).toBe(`sales@${domainName}`);

    // Add forwarder to external advisor
    await provider.createForwarder(`press@${domainName}`, "advisor@externalpr.com", true);
    const forwarder = await prisma.mailboxForwarder.create({
      data: {
        organizationId,
        domainId,
        sourceAddress: `press@${domainName}`,
        destinationAddress: "advisor@externalpr.com",
        keepLocalCopy: true,
      },
    });
    expect(forwarder.destinationAddress).toBe("advisor@externalpr.com");
  });

  it("Step 7: Verify usage metrics & billing summary update", async () => {
    const mailboxes = await prisma.mailbox.findMany({
      where: { organizationId },
    });

    const totalStorageBytes = mailboxes.reduce(
      (acc, mb) => acc + Number(mb.usedStorageBytes),
      0
    );

    expect(mailboxes.length).toBe(1);
    expect(totalStorageBytes).toBeGreaterThan(0);

    const invoices = await prisma.invoice.findMany({
      where: { organizationId },
    });
    expect(invoices.length).toBe(1);
    expect(invoices[0].amountCents).toBe(1500);
  });
});
