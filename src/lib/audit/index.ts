import { prisma } from "@/lib/db/prisma";

export interface CreateAuditLogParams {
  actorId?: string;
  actorRole?: string;
  organizationId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        organizationId: params.organizationId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Audit logs must never crash the main transaction, but errors should be reported
    console.error("[AUDIT_LOG_ERROR] Failed to record audit log:", error);
  }
}
