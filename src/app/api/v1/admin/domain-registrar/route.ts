import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    await requireSuperAdmin();

    const dbSettings = await prisma.systemSetting.findMany({
      where: { category: "REGISTRAR" },
    });
    const map = new Map(dbSettings.map((s) => [s.key, s.value]));

    const apiKey = map.get("REGISTRAR_API_KEY") || process.env.REGISTRAR_API_KEY || "";
    const apiSecret = map.get("REGISTRAR_API_SECRET") || process.env.REGISTRAR_API_SECRET || "";

    const mask = (val: string) => {
      if (!val) return "";
      if (val.length <= 8) return "••••••••";
      return `••••••••${val.slice(-4)}`;
    };

    const settings = {
      activeProvider: map.get("REGISTRAR_PROVIDER") || process.env.REGISTRAR_PROVIDER || "mock",
      environment: map.get("REGISTRAR_ENV") || process.env.REGISTRAR_ENV || "sandbox",
      apiUser: map.get("REGISTRAR_API_USER") || process.env.REGISTRAR_API_USER || "",
      apiKey: mask(apiKey),
      hasApiKey: Boolean(apiKey),
      apiSecret: mask(apiSecret),
      hasApiSecret: Boolean(apiSecret),
      baseUrl: map.get("REGISTRAR_BASE_URL") || process.env.REGISTRAR_BASE_URL || "",
      nameserver1: map.get("DNS_NAMESERVER_1") || process.env.MAIL_NS1 || "ns1.monogrammail.com",
      nameserver2: map.get("DNS_NAMESERVER_2") || process.env.MAIL_NS2 || "ns2.monogrammail.com",
      markupPercent: Number(map.get("REGISTRAR_MARKUP_PERCENT") || "20"),
      currency: map.get("REGISTRAR_CURRENCY") || "USD",
    };

    return NextResponse.json({ settings });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    const body = await req.json();

    const {
      activeProvider,
      environment,
      apiUser,
      apiKey,
      apiSecret,
      baseUrl,
      nameserver1,
      nameserver2,
      markupPercent,
      currency,
    } = body;

    const upsertSetting = async (key: string, value: string) => {
      await prisma.systemSetting.upsert({
        where: { key },
        create: {
          key,
          value,
          category: "REGISTRAR",
        },
        update: {
          value,
        },
      });
    };

    if (activeProvider !== undefined) await upsertSetting("REGISTRAR_PROVIDER", activeProvider);
    if (environment !== undefined) await upsertSetting("REGISTRAR_ENV", environment);
    if (apiUser !== undefined) await upsertSetting("REGISTRAR_API_USER", apiUser);
    if (apiKey && !apiKey.startsWith("••••")) await upsertSetting("REGISTRAR_API_KEY", apiKey);
    if (apiSecret && !apiSecret.startsWith("••••")) await upsertSetting("REGISTRAR_API_SECRET", apiSecret);
    if (baseUrl !== undefined) await upsertSetting("REGISTRAR_BASE_URL", baseUrl);
    if (nameserver1 !== undefined) await upsertSetting("DNS_NAMESERVER_1", nameserver1);
    if (nameserver2 !== undefined) await upsertSetting("DNS_NAMESERVER_2", nameserver2);
    if (markupPercent !== undefined) await upsertSetting("REGISTRAR_MARKUP_PERCENT", String(markupPercent));
    if (currency !== undefined) await upsertSetting("REGISTRAR_CURRENCY", currency);

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: "DOMAIN_REGISTRAR_SETTINGS_UPDATED",
      resourceType: "SystemSetting",
      metadata: { activeProvider, environment },
    });

    return NextResponse.json({ message: "Domain Registrar settings successfully saved." });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
