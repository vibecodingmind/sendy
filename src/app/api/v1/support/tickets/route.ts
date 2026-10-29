import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { user, organization } = await requireTenantContext();
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereClause: any = {};

    if (!isSuperAdmin) {
      whereClause.organizationId = organization.id;
    } else {
      const orgFilter = searchParams.get("organizationId");
      if (orgFilter) {
        whereClause.organizationId = orgFilter;
      }
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
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
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ tickets });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organization } = await requireTenantContext();
    const body = await request.json();
    const { subject, message, priority = "MEDIUM" } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    const ticketNumber = `TICK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        ticketNumber,
        subject: subject.trim(),
        priority: ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority) ? priority : "MEDIUM",
        status: "OPEN",
        messages: {
          create: {
            userId: user.id,
            message: message.trim(),
            isStaff: false,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    await logAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      organizationId: organization.id,
      action: "TICKET_CREATED",
      resourceType: "SupportTicket",
      resourceId: ticket.id,
      metadata: { ticketNumber, subject },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to create ticket" }, { status: 500 });
  }
}
