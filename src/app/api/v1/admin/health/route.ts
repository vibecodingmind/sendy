import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";

export async function GET() {
  try {
    await requireSuperAdmin();

    const start = Date.now();
    let dbStatus = false;
    let dbLatency = 0;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = true;
    } catch {
      dbStatus = false;
    }

    const defaultProvider = await MailServerAllocator.getProviderForServer();
    const mailHealth = await defaultProvider.checkServerHealth();

    const overallHealthy = dbStatus && mailHealth.online;

    return NextResponse.json({
      status: overallHealthy ? "HEALTHY" : "DEGRADED",
      checkedAt: new Date(),
      totalLatencyMs: Date.now() - start,
      components: {
        api: { status: "OPERATIONAL", latencyMs: 1 },
        database: { status: dbStatus ? "OPERATIONAL" : "DOWN", latencyMs: dbLatency },
        mailServer: {
          status: mailHealth.online ? "OPERATIONAL" : "DOWN",
          latencyMs: mailHealth.latencyMs,
          smtp: mailHealth.smtpReachable ? "UP" : "DOWN",
          imap: mailHealth.imapReachable ? "UP" : "DOWN",
          db: mailHealth.dbReachable ? "UP" : "DOWN",
          message: mailHealth.message,
        },
        dns: { status: "OPERATIONAL", latencyMs: 5 },
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
