import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSuperAdmin } from "@/lib/auth/session";
import { getAppSettings, defaultSettings } from "@/lib/config";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    await requireSuperAdmin();
    const settings = await getAppSettings();
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

    const allowedKeys = [
      "APP_NAME",
      "SUPPORT_EMAIL",
      "MAIL_WEBMAIL_URL",
      "MAIL_IMAP_HOST",
      "MAIL_IMAP_PORT",
      "MAIL_SMTP_HOST",
      "MAIL_SMTP_PORT",
      "MAIL_MX_HOST",
      "MAIL_MX_PRIORITY",
      "MAIL_DKIM_SELECTOR",
      "DNS_NAMESERVER_1",
      "DNS_NAMESERVER_2",
    ];

    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key },
          create: {
            key,
            value: String(body[key]),
            category: key.startsWith("MAIL_MX") ? "DNS" : key.startsWith("MAIL") ? "MAIL" : "GENERAL",
          },
          update: {
            value: String(body[key]),
          },
        });
      }
    }

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: "SYSTEM_SETTINGS_UPDATED",
      resourceType: "SystemSetting",
      metadata: body,
    });

    const updated = await getAppSettings();
    return NextResponse.json({ message: "Settings updated successfully.", settings: updated });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
