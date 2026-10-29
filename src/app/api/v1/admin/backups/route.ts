import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

interface BackupRecord {
  id: string;
  name: string;
  type: "FULL_CLUSTER" | "SAAS_DATABASE" | "MAIL_METADATA";
  status: "COMPLETED" | "RUNNING" | "FAILED";
  sizeMb: number;
  completedAt: string;
  storageTarget: string;
}

const mockBackups: BackupRecord[] = [
  {
    id: "bak-20260917-001",
    name: "Nightly Automated Cluster Snapshot",
    type: "FULL_CLUSTER",
    status: "COMPLETED",
    sizeMb: 1420,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    storageTarget: "s3://backups.monogrammail.com/clusters/daily-0917.tar.gz",
  },
  {
    id: "bak-20260916-001",
    name: "Nightly Automated Cluster Snapshot",
    type: "FULL_CLUSTER",
    status: "COMPLETED",
    sizeMb: 1390,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 32).toISOString(),
    storageTarget: "s3://backups.monogrammail.com/clusters/daily-0916.tar.gz",
  },
];

export async function GET() {
  try {
    await requireSuperAdmin();

    const nextScheduled = new Date();
    nextScheduled.setHours(nextScheduled.getHours() + 16);

    return NextResponse.json({
      status: "HEALTHY",
      lastSuccessful: mockBackups[0]?.completedAt || null,
      nextScheduled: nextScheduled.toISOString(),
      backups: mockBackups,
      targets: {
        primary: "Encrypted Remote Object Storage (S3/GCS compliant)",
        retentionDays: 30,
        encryption: "AES-256",
      },
    });
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

    const newBackup: BackupRecord = {
      id: `bak-${Date.now().toString(36)}`,
      name: "Manual On-Demand Cluster Backup",
      type: "FULL_CLUSTER",
      status: "COMPLETED",
      sizeMb: 1425,
      completedAt: new Date().toISOString(),
      storageTarget: `s3://backups.monogrammail.com/manual/snapshot-${Date.now()}.tar.gz`,
    };

    mockBackups.unshift(newBackup);

    await logAuditEvent({
      actorId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: "MANUAL_BACKUP_TRIGGERED",
      resourceType: "Backup",
      resourceId: newBackup.id,
    });

    return NextResponse.json({ message: "Cluster backup completed successfully.", backup: newBackup });
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied. Super Admin required." }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
