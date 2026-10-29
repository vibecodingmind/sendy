import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { MailServerAllocator } from "@/lib/mail/MailServerAllocator";

export async function GET() {
  const started = Date.now();
  let database = false;
  let mailProvider: "unknown" | "online" | "degraded" | "offline" = "unknown";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  try {
    const server = await prisma.mailServer.findFirst({ where: { isActive: true } });
    if (server) {
      const provider = await MailServerAllocator.getProviderForServer(server.id);
      const health = await provider.checkServerHealth();
      mailProvider = health.online ? "online" : health.dbReachable ? "degraded" : "offline";
    } else {
      mailProvider = "unknown";
    }
  } catch {
    mailProvider = "offline";
  }

  const operational = database && mailProvider !== "offline";
  const latencyMs = Date.now() - started;

  return NextResponse.json(
    {
      status: operational ? "operational" : "degraded",
      components: {
        controlPlane: database ? "operational" : "outage",
        mailInfrastructure: mailProvider,
      },
      latencyMs,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
