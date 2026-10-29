import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { organization } = await requireTenantContext();
    const body = await request.json();
    const { isRead, isStarred, folder } = body;

    const message = await prisma.webmailMessage.findUnique({
      where: { id: params.id },
      include: { mailbox: true },
    });

    if (!message || message.mailbox.organizationId !== organization.id) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const data: any = {};
    if (typeof isRead === "boolean") data.isRead = isRead;
    if (typeof isStarred === "boolean") data.isStarred = isStarred;
    if (folder && ["INBOX", "SENT", "DRAFTS", "TRASH", "ARCHIVE"].includes(folder)) {
      data.folder = folder;
    }

    const updated = await prisma.webmailMessage.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ message: updated });
  } catch (err: any) {
    if (err.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to update message" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { organization } = await requireTenantContext();

    const message = await prisma.webmailMessage.findUnique({
      where: { id: params.id },
      include: { mailbox: true },
    });

    if (!message || message.mailbox.organizationId !== organization.id) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.folder === "TRASH") {
      // Permanently delete
      await prisma.webmailMessage.delete({ where: { id: params.id } });
      return NextResponse.json({ deleted: true, permanent: true });
    } else {
      // Move to trash
      const updated = await prisma.webmailMessage.update({
        where: { id: params.id },
        data: { folder: "TRASH" },
      });
      return NextResponse.json({ message: updated, movedToTrash: true });
    }
  } catch (err: any) {
    if (err.message?.includes("UNAUTHORIZED")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Failed to delete message" }, { status: 500 });
  }
}
