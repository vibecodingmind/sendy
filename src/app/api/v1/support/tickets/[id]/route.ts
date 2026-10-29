import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { user, organization } = await requireTenantContext();
    const isSuperAdmin = user.role === "SUPER_ADMIN";

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        messages: {
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
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!isSuperAdmin && ticket.organizationId !== organization.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { user, organization } = await requireTenantContext();
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const body = await request.json();
    const { status, priority } = body;

    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!isSuperAdmin && existingTicket.organizationId !== organization.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const data: any = {};
    if (status && ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) {
      data.status = status;
    }
    if (priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
      data.priority = priority;
    }

    const updated = await prisma.supportTicket.update({
      where: { id: params.id },
      data,
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: existingTicket.organizationId,
      action: "TICKET_UPDATED",
      resourceType: "SupportTicket",
      resourceId: updated.id,
      metadata: { status, priority },
    });

    return NextResponse.json({ ticket: updated });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to update ticket" }, { status: 500 });
  }
}
