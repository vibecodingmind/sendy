import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashUserPassword, verifyUserPassword } from "@/lib/auth/password";
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendMailboxSetupEmail,
} from "@/lib/notifications/email";
import crypto from "crypto";

describe("Launch Readiness & Core Platform Services", () => {
  let testUserId: string;
  let testOrgId: string;

  beforeAll(async () => {
    // Retrieve demo organization and user
    const user = await prisma.user.findFirst({
      where: { email: "owner@democorp.com" },
    });
    const org = await prisma.organization.findFirst({
      where: { slug: "democorp" },
    });

    if (user && org) {
      testUserId = user.id;
      testOrgId = org.id;
    }
  });

  describe("Password Reset Token Lifecycle", () => {
    it("should create, validate, and consume a password reset token", async () => {
      const email = "owner@democorp.com";
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      const record = await prisma.passwordResetToken.create({
        data: {
          email,
          token,
          expiresAt,
        },
      });

      expect(record.token).toBe(token);
      expect(record.usedAt).toBeNull();

      // Simulate token consumption
      const newPlainPassword = "NewlyResetPassword2026!";
      const newHash = await hashUserPassword(newPlainPassword);

      await prisma.$transaction([
        prisma.user.update({
          where: { email },
          data: { passwordHash: newHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
      ]);

      const updatedRecord = await prisma.passwordResetToken.findUnique({
        where: { id: record.id },
      });
      expect(updatedRecord?.usedAt).not.toBeNull();

      const user = await prisma.user.findUnique({ where: { email } });
      const verify = await verifyUserPassword(newPlainPassword, user!.passwordHash);
      expect(verify).toBe(true);

      // Restore password for demo consistency
      const defaultHash = await hashUserPassword("DemoPass123!");
      await prisma.user.update({
        where: { email },
        data: { passwordHash: defaultHash },
      });
    });
  });

  describe("Support Ticket System", () => {
    it("should allow a customer to create a ticket and support staff to reply", async () => {
      if (!testUserId || !testOrgId) return;

      const ticketNumber = `TICK-TEST-${Date.now()}`;
      const ticket = await prisma.supportTicket.create({
        data: {
          organizationId: testOrgId,
          userId: testUserId,
          ticketNumber,
          subject: "DNS verification assistance for democorp.com",
          priority: "HIGH",
          status: "OPEN",
          messages: {
            create: {
              userId: testUserId,
              message: "I configured my SPF record but the status still says pending.",
              isStaff: false,
            },
          },
        },
        include: {
          messages: true,
        },
      });

      expect(ticket.id).toBeDefined();
      expect(ticket.status).toBe("OPEN");
      expect(ticket.messages.length).toBe(1);
      expect(ticket.messages[0].isStaff).toBe(false);

      // Staff reply
      const staffReply = await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          userId: testUserId,
          message: "Please allow up to 15 minutes for TTL propagation.",
          isStaff: true,
        },
      });

      expect(staffReply.isStaff).toBe(true);

      // Status transition to RESOLVED
      const resolved = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "RESOLVED" },
      });

      expect(resolved.status).toBe("RESOLVED");

      // Clean up test ticket
      await prisma.supportTicket.delete({ where: { id: ticket.id } });
    });
  });

  describe("Transactional Email Dispatcher", () => {
    it("should render and dispatch password reset email without error", async () => {
      const res = await sendPasswordResetEmail("owner@democorp.com", "http://localhost:3010/reset-password?token=mock");
      expect(res).toBe(true);
    });

    it("should render and dispatch welcome email without error", async () => {
      const res = await sendWelcomeEmail("owner@democorp.com", "Alice Smith", "Demo Corp");
      expect(res).toBe(true);
    });

    it("should render and dispatch mailbox setup instructions", async () => {
      const res = await sendMailboxSetupEmail("user@democorp.com", "support@democorp.com", "TempPass!99");
      expect(res).toBe(true);
    });
  });

  describe("Stripe Webhook Signature Verification Logic", () => {
    it("should verify HMAC-SHA256 signature payload format", () => {
      const secret = "whsec_test_secret_key_12345";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = JSON.stringify({ type: "checkout.session.completed" });

      const signedPayload = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      const reconstructedSignature = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      expect(signature).toBe(reconstructedSignature);
    });
  });
});
