import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/config";

export async function GET() {
  const settings = await getAppSettings();

  const spec = {
    openapi: "3.0.3",
    info: {
      title: `${settings.appName} REST API`,
      version: "1.0.0",
      description: "Comprehensive REST API for multi-tenant business email hosting, domain management, mailbox provisioning, live DNS verification, and infrastructure management.",
    },
    servers: [
      {
        url: `${settings.appUrl}/api/v1`,
        description: "Primary SaaS API Server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "monogram_session",
        },
      },
    },
    paths: {
      "/auth/register": {
        post: {
          summary: "Register new customer organization and administrator",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "organizationName"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    organizationName: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Organization registered successfully" },
            400: { description: "Validation error" },
            409: { description: "Email already exists" },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Authenticate user and issue session cookie",
          tags: ["Authentication"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/auth/me": {
        get: {
          summary: "Get current authenticated identity and tenant scope",
          tags: ["Authentication"],
          security: [{ cookieAuth: [] }],
          responses: {
            200: { description: "Active session and organization context" },
            401: { description: "Not authenticated" },
          },
        },
      },
      "/domains": {
        get: {
          summary: "List all domains belonging to authenticated organization",
          tags: ["Domains"],
          security: [{ cookieAuth: [] }],
          responses: { 200: { description: "Array of domains" } },
        },
        post: {
          summary: "Add a custom domain and generate DKIM 2048-bit key",
          tags: ["Domains"],
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["domain"],
                  properties: {
                    domain: { type: "string", example: "company.com" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Domain added with required DNS records" },
            403: { description: "Plan limit exceeded" },
            409: { description: "Domain already registered" },
          },
        },
      },
      "/domains/{id}/verify": {
        post: {
          summary: "Perform live DNS queries for MX, SPF, DKIM, DMARC",
          tags: ["Domains"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Live verification diagnostic results" } },
        },
      },
      "/mailboxes": {
        get: {
          summary: "List provisioned mailboxes for organization",
          tags: ["Mailboxes"],
          security: [{ cookieAuth: [] }],
          responses: { 200: { description: "Array of mailboxes with live storage usage" } },
        },
        post: {
          summary: "Provision a new mailbox on mail infrastructure with Dovecot SSHA512 hash",
          tags: ["Mailboxes"],
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["domainId", "username", "password"],
                  properties: {
                    domainId: { type: "string" },
                    username: { type: "string", example: "john" },
                    password: { type: "string", minLength: 8 },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    storageLimitMb: { type: "integer", default: 10240 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Mailbox provisioned" },
            403: { description: "Plan mailbox limit reached" },
            409: { description: "Mailbox already exists" },
          },
        },
      },
      "/mailboxes/{id}/reset-password": {
        post: {
          summary: "Reset mailbox password and update Dovecot password hash",
          tags: ["Mailboxes"],
          security: [{ cookieAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["newPassword"],
                  properties: { newPassword: { type: "string", minLength: 8 } },
                },
              },
            },
          },
          responses: { 200: { description: "Password updated successfully" } },
        },
      },
      "/aliases": {
        get: { summary: "List email aliases", tags: ["Aliases"], security: [{ cookieAuth: [] }] },
        post: { summary: "Create an email alias", tags: ["Aliases"], security: [{ cookieAuth: [] }] },
        delete: { summary: "Delete an email alias", tags: ["Aliases"], security: [{ cookieAuth: [] }] },
      },
      "/forwarders": {
        get: { summary: "List external forwarders", tags: ["Forwarders"], security: [{ cookieAuth: [] }] },
        post: { summary: "Create an external forwarder", tags: ["Forwarders"], security: [{ cookieAuth: [] }] },
        delete: { summary: "Delete an external forwarder", tags: ["Forwarders"], security: [{ cookieAuth: [] }] },
      },
      "/billing/subscription": {
        get: { summary: "Get subscription status and plan limits", tags: ["Billing"], security: [{ cookieAuth: [] }] },
      },
      "/billing/checkout": {
        post: { summary: "Initiate plan upgrade checkout session", tags: ["Billing"], security: [{ cookieAuth: [] }] },
      },
      "/admin/overview": {
        get: { summary: "Platform cluster overview metrics", tags: ["Admin"], security: [{ cookieAuth: [] }] },
      },
      "/admin/health": {
        get: { summary: "Live system health (API, DB, Mail, SMTP, IMAP, DNS)", tags: ["Admin"], security: [{ cookieAuth: [] }] },
      },
      "/admin/servers": {
        get: { summary: "List cluster nodes and capacity", tags: ["Admin"], security: [{ cookieAuth: [] }] },
        post: { summary: "Add a mail server node", tags: ["Admin"], security: [{ cookieAuth: [] }] },
      },
    },
  };

  return NextResponse.json(spec);
}
