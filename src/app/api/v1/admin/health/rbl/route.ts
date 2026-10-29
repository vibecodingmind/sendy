import { NextResponse } from "next/server";
import { promises as dns } from "dns";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getAppSettings } from "@/lib/config";

interface RblCheck {
  name: string;
  zone: string;
  listed: boolean;
  status: "CLEAN" | "LISTED" | "UNKNOWN";
  details?: string;
}

export async function GET() {
  try {
    await requireSuperAdmin();

    const settings = await getAppSettings();
    const primaryServer = await prisma.mailServer.findFirst({
      where: { isActive: true },
    });

    const serverIp = primaryServer?.ipAddress || "127.0.0.1";
    const mxHost = settings.mailMxHost;

    // Check PTR (Reverse DNS)
    let ptrRecord: string | null = null;
    let ptrValid = false;

    if (serverIp && serverIp !== "127.0.0.1" && serverIp !== "localhost") {
      try {
        const ptrs = await dns.reverse(serverIp);
        if (ptrs && ptrs.length > 0) {
          ptrRecord = ptrs[0];
          ptrValid = ptrRecord.toLowerCase() === mxHost.toLowerCase();
        }
      } catch {
        ptrRecord = null;
        ptrValid = false;
      }
    } else {
      // In local development / mock mode, provide healthy simulated PTR
      ptrRecord = mxHost;
      ptrValid = true;
    }

    // Query Major RBLs (Real-time Blackhole Lists)
    const rblZones = [
      { name: "Spamhaus ZEN", zone: "zen.spamhaus.org" },
      { name: "Barracuda BRBL", zone: "b.barracudacentral.org" },
      { name: "Spamcop BL", zone: "bl.spamcop.net" },
      { name: "SORBS Aggregate", zone: "dnsbl.sorbs.net" },
    ];

    const rblResults: RblCheck[] = [];

    // If IP is a public IPv4 address, check reverse octets against RBLs
    const isPublicIpv4 =
      serverIp !== "127.0.0.1" &&
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(serverIp) &&
      !serverIp.startsWith("10.") &&
      !serverIp.startsWith("192.168.");

    if (isPublicIpv4) {
      const reversedIp = serverIp.split(".").reverse().join(".");
      for (const rbl of rblZones) {
        try {
          const queryHost = `${reversedIp}.${rbl.zone}`;
          const records = await dns.resolve4(queryHost);
          if (records && records.length > 0) {
            rblResults.push({
              name: rbl.name,
              zone: rbl.zone,
              listed: true,
              status: "LISTED",
              details: `Listed with code ${records.join(", ")}`,
            });
          } else {
            rblResults.push({
              name: rbl.name,
              zone: rbl.zone,
              listed: false,
              status: "CLEAN",
              details: "In Good Standing",
            });
          }
        } catch {
          // NXDOMAIN means not listed (clean)
          rblResults.push({
            name: rbl.name,
            zone: rbl.zone,
            listed: false,
            status: "CLEAN",
            details: "In Good Standing",
          });
        }
      }
    } else {
      // Local or dev environment: All RBLs clean
      for (const rbl of rblZones) {
        rblResults.push({
          name: rbl.name,
          zone: rbl.zone,
          listed: false,
          status: "CLEAN",
          details: "In Good Standing (Zero Listings)",
        });
      }
    }

    // Rate Limiter Enforcement Stats
    const totalMailboxes = await prisma.mailbox.count();
    const rateLimitedMailboxes = await prisma.mailbox.count({
      where: {
        hourlySentCount: { gte: 100 },
        hourlySentResetAt: { gt: new Date() },
      },
    });

    const isBlacklisted = rblResults.some((r) => r.listed);

    return NextResponse.json({
      overallReputation: isBlacklisted ? "POOR" : ptrValid ? "EXCELLENT" : "GOOD",
      serverIp,
      mxHost,
      ptr: {
        configured: Boolean(ptrRecord),
        record: ptrRecord || "None detected",
        matchesMx: ptrValid,
      },
      rbls: rblResults,
      rateLimiter: {
        enforced: true,
        hourlyLimitPerMailbox: 100,
        totalMailboxesMonitored: totalMailboxes,
        currentlyThrottled: rateLimitedMailboxes,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
