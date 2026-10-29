import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { user, organization } = await requireTenantContext();
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty" }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!isSuperAdmin && ticket.organizationId !== organization.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const isStaff = isSuperAdmin || user.role === "SUPER_ADMIN";

    const newMessage = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message: message.trim(),
        isStaff,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Auto-update ticket status: if staff replies, set to IN_PROGRESS; if customer replies, set to OPEN if it was resolved
    let newStatus = ticket.status;
    if (isStaff && ticket.status === "OPEN") {
      newStatus = "IN_PROGRESS";
    } else if (!isStaff && (ticket.status === "RESOLVED" || ticket.status === "CLOSED")) {
      newStatus = "OPEN";
    }

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: ticket.organizationId,
      action: "TICKET_REPLIED",
      resourceType: "SupportTicket",
      resourceId: ticket.id,
      metadata: { isStaff, messageLength: message.length },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to submit reply" }, { status: 500 });
  }
}
