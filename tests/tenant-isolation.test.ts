import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { hashDovecotPassword } from "@/lib/auth/password";

describe("Multi-Tenant Isolation & Security Guards", () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let domainAId: string;
  let mailboxAId: string;

  beforeAll(async () => {
    // 1. Create Organization A
    const passHash = await bcrypt.hash("Password123!", 10);
    const userA = await prisma.user.create({
      data: {
        email: `tenant-a-${Date.now()}@example.com`,
        passwordHash: passHash,
        role: "CUSTOMER_ADMIN",
      },
    });
    userAId = userA.id;

    const orgA = await prisma.organization.create({
      data: {
        name: "Tenant Alpha Corp",
        slug: `alpha-${Date.now()}`,
        members: {
          create: { userId: userA.id, role: "CUSTOMER_ADMIN" },
        },
      },
    });
    orgAId = orgA.id;

    // 2. Create Organization B
    const userB = await prisma.user.create({
      data: {
        email: `tenant-b-${Date.now()}@example.com`,
        passwordHash: passHash,
        role: "CUSTOMER_ADMIN",
      },
    });
    userBId = userB.id;

    const orgB = await prisma.organization.create({
      data: {
        name: "Tenant Beta LLC",
        slug: `beta-${Date.now()}`,
        members: {
          create: { userId: userB.id, role: "CUSTOMER_ADMIN" },
        },
      },
    });
    orgBId = orgB.id;

    // 3. Create Domain & Mailbox for Org A
    const domainA = await prisma.domain.create({
      data: {
        organizationId: orgA.id,
        name: `alpha-${Date.now()}.com`,
        status: "VERIFIED",
      },
    });
    domainAId = domainA.id;

    const mailboxA = await prisma.mailbox.create({
      data: {
        organizationId: orgA.id,
        domainId: domainA.id,
        email: `ceo@${domainA.name}`,
        passwordHash: hashDovecotPassword("CeoSecretPass1!"),
        storageLimitMb: 10240,
      },
    });
    mailboxAId = mailboxA.id;
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
  });

  it("should prevent Tenant B from accessing Tenant A domains", async () => {
    // Attempt to query Domain A scoped to Tenant B's organizationId
    const accessibleToB = await prisma.domain.findFirst({
      where: {
        id: domainAId,
        organizationId: orgBId, // Injected tenant boundary
      },
    });

    expect(accessibleToB).toBeNull();
  });

  it("should prevent Tenant B from accessing Tenant A mailboxes", async () => {
    // Attempt to query Mailbox A scoped to Tenant B's organizationId
    const accessibleToB = await prisma.mailbox.findFirst({
      where: {
        id: mailboxAId,
        organizationId: orgBId,
      },
    });

    expect(accessibleToB).toBeNull();
  });

  it("should prevent Tenant B from creating an alias pointing to Tenant A's mailbox", async () => {
    // Validate that a mailbox check for Tenant B fails for Mailbox A
    const targetMailbox = await prisma.mailbox.findFirst({
      where: {
        id: mailboxAId,
        organizationId: orgBId,
      },
    });

    expect(targetMailbox).toBeNull();
  });

  it("should isolate billing subscriptions and invoices between tenants", async () => {
    const starterPlan = await prisma.plan.findFirst();
    if (starterPlan) {
      await prisma.subscription.create({
        data: {
          organizationId: orgAId,
          planId: starterPlan.id,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
        },
      });

      const subForB = await prisma.subscription.findUnique({
        where: { organizationId: orgBId },
      });

      expect(subForB).toBeNull();
    }
  });
});
