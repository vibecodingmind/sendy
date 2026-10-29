import { prisma } from "@/lib/db/prisma";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  resetInMinutes: number;
}

export class OutboundRateLimiter {
  private static readonly DEFAULT_HOURLY_LIMIT = 100;

  /**
   * Checks if a mailbox has exceeded its hourly sending quota, and increments the count if allowed.
   */
  public static async checkAndIncrement(
    mailboxId: string,
    limitPerHour: number = OutboundRateLimiter.DEFAULT_HOURLY_LIMIT
  ): Promise<RateLimitResult> {
    const now = new Date();

    const mailbox = await prisma.mailbox.findUnique({
      where: { id: mailboxId },
      select: {
        id: true,
        email: true,
        hourlySentCount: true,
        hourlySentResetAt: true,
      },
    });

    if (!mailbox) {
      throw new Error(`Mailbox not found: ${mailboxId}`);
    }

    // If reset window has expired or was never set, begin new 1-hour window
    if (!mailbox.hourlySentResetAt || now >= mailbox.hourlySentResetAt) {
      const nextReset = new Date(now.getTime() + 60 * 60 * 1000);
      await prisma.mailbox.update({
        where: { id: mailboxId },
        data: {
          hourlySentCount: 1,
          hourlySentResetAt: nextReset,
        },
      });

      return {
        allowed: true,
        count: 1,
        limit: limitPerHour,
        remaining: Math.max(0, limitPerHour - 1),
        resetAt: nextReset,
        resetInMinutes: 60,
      };
    }

    // Inside active window: check if exceeded
    if (mailbox.hourlySentCount >= limitPerHour) {
      const resetInMs = mailbox.hourlySentResetAt.getTime() - now.getTime();
      const resetInMinutes = Math.max(1, Math.ceil(resetInMs / (60 * 1000)));

      return {
        allowed: false,
        count: mailbox.hourlySentCount,
        limit: limitPerHour,
        remaining: 0,
        resetAt: mailbox.hourlySentResetAt,
        resetInMinutes,
      };
    }

    // Allowed: increment count
    const updated = await prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        hourlySentCount: { increment: 1 },
      },
      select: {
        hourlySentCount: true,
        hourlySentResetAt: true,
      },
    });

    const resetInMs = updated.hourlySentResetAt!.getTime() - now.getTime();
    const resetInMinutes = Math.max(1, Math.ceil(resetInMs / (60 * 1000)));

    return {
      allowed: true,
      count: updated.hourlySentCount,
      limit: limitPerHour,
      remaining: Math.max(0, limitPerHour - updated.hourlySentCount),
      resetAt: updated.hourlySentResetAt!,
      resetInMinutes,
    };
  }

  /**
   * Resets rate limit counters for a given mailbox (e.g. admin unblocking an account).
   */
  public static async resetRateLimit(mailboxId: string): Promise<void> {
    await prisma.mailbox.update({
      where: { id: mailboxId },
      data: {
        hourlySentCount: 0,
        hourlySentResetAt: null,
      },
    });
  }
}
