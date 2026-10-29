import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/session";

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  sender: string;
  recipient: string;
  domain: string;
  status: "DELIVERED" | "DEFERRED" | "BOUNCED" | "QUEUED";
  direction: "INBOUND" | "OUTBOUND";
  messageId: string;
  server: string;
  responseCode: string;
}

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin();

    // Production log reader or cluster mail log stream (Postfix syslog analyzer)
    const logs: EmailLogEntry[] = [
      {
        id: "msg-001",
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        sender: "john@democorp.com",
        recipient: "client@externalpartner.com",
        domain: "democorp.com",
        status: "DELIVERED",
        direction: "OUTBOUND",
        messageId: "<20260917.114210.12345@democorp.com>",
        server: "MAIL-01",
        responseCode: "250 2.0.0 Ok: queued as 4X8m2s",
      },
      {
        id: "msg-002",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        sender: "sales@democorp.com",
        recipient: "buyer@prospect.org",
        domain: "democorp.com",
        status: "DELIVERED",
        direction: "OUTBOUND",
        messageId: "<20260917.112800.67890@democorp.com>",
        server: "MAIL-01",
        responseCode: "250 2.0.0 Delivered to destination MX",
      },
      {
        id: "msg-003",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        sender: "newsletter@updates.tech",
        recipient: "john@democorp.com",
        domain: "democorp.com",
        status: "DELIVERED",
        direction: "INBOUND",
        messageId: "<tech.updates.0917@mail.updates.tech>",
        server: "MAIL-01",
        responseCode: "250 2.1.5 Ok (Dovecot LDA delivered)",
      },
      {
        id: "msg-004",
        timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        sender: "invoicing@democorp.com",
        recipient: "finance@unreachable-domain-xyz.net",
        domain: "democorp.com",
        status: "DEFERRED",
        direction: "OUTBOUND",
        messageId: "<inv.20260917@democorp.com>",
        server: "MAIL-01",
        responseCode: "451 4.4.1 Destination host unreachable (retrying)",
      },
    ];

    return NextResponse.json({ logs });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
