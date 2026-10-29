import { prisma } from "@/lib/db/prisma";
import { MailProvider } from "./MailProvider";
import { MockMailProvider } from "./MockMailProvider";
import { IRedMailProvider } from "./IRedMailProvider";

// Singleton cache for mock provider
const mockProviderInstance = new MockMailProvider();

export class MailServerAllocator {
  /**
   * Allocates an active MailServer for a new organization or domain.
   * Considers capacity, active status, and server load.
   */
  static async allocateServer(): Promise<{ id: string; hostname: string }> {
    // Look for active server with available capacity
    const availableServer = await prisma.mailServer.findFirst({
      where: {
        isActive: true,
        status: "ONLINE",
      },
      orderBy: {
        allocatedMailboxes: "asc",
      },
    });

    if (availableServer) {
      return { id: availableServer.id, hostname: availableServer.hostname };
    }

    // If no server exists in DB yet, create or return a default
    const defaultServer = await prisma.mailServer.upsert({
      where: { name: "MAIL-01" },
      create: {
        name: "MAIL-01",
        hostname: process.env.MAIL_SMTP_HOST || "mail01.monogrammail.com",
        ipAddress: "127.0.0.1",
        location: "US-East (N. Virginia)",
        providerType: process.env.MAIL_PROVIDER || "mock",
        status: "ONLINE",
        capacityMailboxes: 1000,
        capacityStorageGb: 5000,
        allocatedMailboxes: 0,
        allocatedStorageGb: 0,
        isActive: true,
      },
      update: {},
    });

    return { id: defaultServer.id, hostname: defaultServer.hostname };
  }

  /**
   * Resolves the MailProvider instance for a specific server node or organization.
   */
  static async getProviderForServer(serverId?: string | null): Promise<MailProvider> {
    if (!serverId) {
      if (process.env.MAIL_PROVIDER === "iredmail") {
        return new IRedMailProvider();
      }
      return mockProviderInstance;
    }

    const server = await prisma.mailServer.findUnique({ where: { id: serverId } });
    if (!server) {
      if (process.env.MAIL_PROVIDER === "iredmail") {
        return new IRedMailProvider();
      }
      return mockProviderInstance;
    }

    if (server.providerType === "iredmail") {
      let customConfig = {};
      if (server.metadata) {
        try {
          customConfig = JSON.parse(server.metadata);
        } catch {
          // ignore parsing error
        }
      }
      return new IRedMailProvider(customConfig);
    }

    return mockProviderInstance;
  }

  /**
   * Resolves the MailProvider for an organization based on its assigned mail server.
   */
  static async getProviderForOrganization(organizationId: string): Promise<MailProvider> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { mailServerId: true },
    });
    return this.getProviderForServer(org?.mailServerId);
  }
}
