import { cookies } from "next/headers";
import { verifySessionToken, SessionPayload } from "./jwt";
import { prisma } from "@/lib/db/prisma";

export const SESSION_COOKIE_NAME = "monogram_session";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export interface TenantContext {
  user: {
    id: string;
    email: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
    mailServerId: string | null;
  };
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd?: Date;
    plan: {
      id: string;
      name: string;
      maxDomains: number;
      maxMailboxes: number;
      maxStorageGb: number;
      maxAliases: number;
      maxForwarders: number;
    };
  } | null;
}

/**
 * Ensures user is authenticated and retrieves their scoped organization context.
 * Throws an Error if unauthorized or trying to cross tenants.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              subscription: {
                include: { plan: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED");
  }

  // If user is SUPER_ADMIN, they can operate across organizations or have a default tenant context
  if (user.role === "SUPER_ADMIN" && session.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (org) {
      if (org.status === "SUSPENDED") {
        throw new Error("ORGANIZATION_SUSPENDED");
      }
      return {
        user: { id: user.id, email: user.email, role: user.role },
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          mailServerId: org.mailServerId,
        },
        subscription: org.subscription
          ? {
              id: org.subscription.id,
              status: org.subscription.status,
              currentPeriodEnd: org.subscription.currentPeriodEnd,
              plan: org.subscription.plan,
            }
          : null,
      };
    }
  }

  const membership = user.memberships[0];
  if (!membership || !membership.organization) {
    throw new Error("NO_ORGANIZATION_FOUND");
  }

  const org = membership.organization;

  if (user.role !== "SUPER_ADMIN" && org.status === "SUSPENDED") {
    throw new Error("ORGANIZATION_SUSPENDED");
  }

  return {
    user: { id: user.id, email: user.email, role: user.role },
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      mailServerId: org.mailServerId,
    },
    subscription: org.subscription
      ? {
          id: org.subscription.id,
          status: org.subscription.status,
          currentPeriodEnd: org.subscription.currentPeriodEnd,
          plan: org.subscription.plan,
        }
      : null,
  };
}

/**
 * Enforces SUPER_ADMIN role for platform operations.
 */
export async function requireSuperAdmin(): Promise<{ id: string; email: string; role: string }> {
  const session = await getCurrentSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive || user.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return { id: user.id, email: user.email, role: user.role };
}
