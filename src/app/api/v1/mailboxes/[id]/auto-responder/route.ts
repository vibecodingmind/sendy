import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization } = await requireTenantContext();

    const mailbox = await prisma.mailbox.findFirst({
      where: { id, organizationId: organization.id },
      select: {
        id: true,
        email: true,
        autoResponderEnabled: true,
        autoResponderSubject: true,
        autoResponderBody: true,
        autoResponderStartDate: true,
        autoResponderEndDate: true,
      },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    }

    return NextResponse.json({
      autoResponder: {
        enabled: mailbox.autoResponderEnabled,
        subject: mailbox.autoResponderSubject || "",
        body: mailbox.autoResponderBody || "",
        startDate: mailbox.autoResponderStartDate ? mailbox.autoResponderStartDate.toISOString().split("T")[0] : "",
        endDate: mailbox.autoResponderEndDate ? mailbox.autoResponderEndDate.toISOString().split("T")[0] : "",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { organization, user } = await requireTenantContext();
    const body = await req.json();

    const mailbox = await prisma.mailbox.findFirst({
      where: { id, organizationId: organization.id },
    });

    if (!mailbox) {
      return NextResponse.json({ error: "Mailbox not found." }, { status: 404 });
    }

    const { enabled, subject, body: messageBody, startDate, endDate } = body;

    const updated = await prisma.mailbox.update({
      where: { id: mailbox.id },
      data: {
        autoResponderEnabled: Boolean(enabled),
        autoResponderSubject: subject !== undefined ? String(subject) : mailbox.autoResponderSubject,
        autoResponderBody: messageBody !== undefined ? String(messageBody) : mailbox.autoResponderBody,
        autoResponderStartDate: startDate ? new Date(startDate) : null,
        autoResponderEndDate: endDate ? new Date(endDate) : null,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "MAILBOX_AUTO_RESPONDER_UPDATED",
      resourceType: "Mailbox",
      resourceId: mailbox.id,
      metadata: {
        mailbox: mailbox.email,
        enabled: updated.autoResponderEnabled,
      },
    });

    return NextResponse.json({
      message: "Out of Office auto-responder updated successfully.",
      autoResponder: {
        enabled: updated.autoResponderEnabled,
        subject: updated.autoResponderSubject || "",
        body: updated.autoResponderBody || "",
        startDate: updated.autoResponderStartDate ? updated.autoResponderStartDate.toISOString().split("T")[0] : "",
        endDate: updated.autoResponderEndDate ? updated.autoResponderEndDate.toISOString().split("T")[0] : "",
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
