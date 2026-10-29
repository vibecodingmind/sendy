import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashDovecot(password: string): string {
  const salt = crypto.randomBytes(8);
  const hash = crypto.createHash("sha512");
  hash.update(Buffer.from(password, "utf8"));
  hash.update(salt);
  const digest = hash.digest();
  const combined = Buffer.concat([digest, salt]);
  return `{SSHA512}${combined.toString("base64")}`;
}

async function main() {
  console.log("Seeding database...");

  // 1. Create Default Mail Server Node
  const server = await prisma.mailServer.upsert({
    where: { name: "MAIL-01" },
    create: {
      name: "MAIL-01",
      hostname: "mail01.monogrammail.com",
      ipAddress: "198.51.100.25",
      location: "US-East (N. Virginia)",
      providerType: "mock",
      status: "ONLINE",
      capacityMailboxes: 1000,
      capacityStorageGb: 5000,
      allocatedMailboxes: 1,
      allocatedStorageGb: 10,
      isActive: true,
      lastHeartbeat: new Date(),
    },
    update: {},
  });

  // 2. Create Plans
  const starterPlan = await prisma.plan.upsert({
    where: { slug: "starter" },
    create: {
      name: "Starter",
      slug: "starter",
      description: "Ideal for solo entrepreneurs and small projects.",
      priceMonthlyCents: 500, // $5.00
      maxDomains: 1,
      maxMailboxes: 5,
      maxStorageGb: 25,
      maxAliases: 10,
      maxForwarders: 10,
      isActive: true,
    },
    update: {},
  });

  const businessPlan = await prisma.plan.upsert({
    where: { slug: "business" },
    create: {
      name: "Business",
      slug: "business",
      description: "Designed for growing teams needing professional mailboxes and storage.",
      priceMonthlyCents: 1500, // $15.00
      maxDomains: 5,
      maxMailboxes: 25,
      maxStorageGb: 250,
      maxAliases: 50,
      maxForwarders: 50,
      isActive: true,
    },
    update: {},
  });

  await prisma.plan.upsert({
    where: { slug: "enterprise" },
    create: {
      name: "Enterprise",
      slug: "enterprise",
      description: "Advanced controls, high volume capacity, and dedicated support.",
      priceMonthlyCents: 4900, // $49.00
      maxDomains: 20,
      maxMailboxes: 100,
      maxStorageGb: 1000,
      maxAliases: 200,
      maxForwarders: 200,
      isActive: true,
    },
    update: {},
  });

  // 3. Create Super Admin User
  const adminPasswordHash = await bcrypt.hash("AdminPass123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@monogrammail.com" },
    create: {
      email: "admin@monogrammail.com",
      passwordHash: adminPasswordHash,
      firstName: "Platform",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      emailVerified: new Date(),
    },
    update: {},
  });

  // 4. Create Demo Customer Organization & Admin
  const customerPasswordHash = await bcrypt.hash("DemoPass123!", 10);
  const customerUser = await prisma.user.upsert({
    where: { email: "owner@democorp.com" },
    create: {
      email: "owner@democorp.com",
      passwordHash: customerPasswordHash,
      firstName: "Jane",
      lastName: "Doe",
      role: "CUSTOMER_ADMIN",
      isActive: true,
      emailVerified: new Date(),
    },
    update: {},
  });

  const demoOrg = await prisma.organization.upsert({
    where: { slug: "demo-corp" },
    create: {
      name: "Demo Corp",
      slug: "demo-corp",
      status: "ACTIVE",
      mailServerId: server.id,
      members: {
        create: {
          userId: customerUser.id,
          role: "CUSTOMER_ADMIN",
        },
      },
    },
    update: {},
  });

  // 5. Create Subscription for Demo Organization
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  await prisma.subscription.upsert({
    where: { organizationId: demoOrg.id },
    create: {
      organizationId: demoOrg.id,
      planId: businessPlan.id,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYearLater,
      paymentProvider: "mock",
    },
    update: {},
  });

  // 6. Create Initial Invoice
  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-2026-0001" },
    create: {
      organizationId: demoOrg.id,
      invoiceNumber: "INV-2026-0001",
      amountCents: 1500,
      currency: "USD",
      status: "PAID",
      dueDate: new Date(),
      paidAt: new Date(),
    },
    update: {},
  });

  // 7. Create Demo Domain
  const demoDomain = await prisma.domain.upsert({
    where: { name: "democorp.com" },
    create: {
      organizationId: demoOrg.id,
      mailServerId: server.id,
      name: "democorp.com",
      status: "VERIFIED",
      dkimSelector: "default",
      dkimPublicKey: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq6F7DemoKeyPlaceholderXYZ==",
      isVerified: true,
      verifiedAt: new Date(),
    },
    update: {},
  });

  // 8. Create Demo Mailbox
  const dovecotPw = hashDovecot("MailboxSecret123!");
  await prisma.mailbox.upsert({
    where: { email: "john@democorp.com" },
    create: {
      organizationId: demoOrg.id,
      domainId: demoDomain.id,
      email: "john@democorp.com",
      firstName: "John",
      lastName: "Doe",
      storageLimitMb: 10240, // 10 GB
      usedStorageBytes: BigInt(7500000000), // ~7.5 GB
      status: "ACTIVE",
      passwordHash: dovecotPw,
    },
    update: {},
  });

  // 9. Create System Settings
  const settings = [
    { key: "APP_NAME", value: "Monogram Mail", category: "GENERAL" },
    { key: "SUPPORT_EMAIL", value: "support@monogrammail.com", category: "GENERAL" },
    { key: "MAIL_WEBMAIL_URL", value: "https://mail.monogrammail.com", category: "MAIL" },
    { key: "MAIL_IMAP_HOST", value: "imap.monogrammail.com", category: "MAIL" },
    { key: "MAIL_IMAP_PORT", value: "993", category: "MAIL" },
    { key: "MAIL_SMTP_HOST", value: "smtp.monogrammail.com", category: "MAIL" },
    { key: "MAIL_SMTP_PORT", value: "465", category: "MAIL" },
    { key: "MAIL_MX_HOST", value: "mx1.monogrammail.com", category: "DNS" },
    { key: "MAIL_MX_PRIORITY", value: "10", category: "DNS" },
    { key: "MAIL_DKIM_SELECTOR", value: "default", category: "DNS" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
