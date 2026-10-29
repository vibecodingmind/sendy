import { getAppSettings } from "../config";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * System Transactional Email Dispatcher.
 * Sends via SMTP when SYSTEM_SMTP_* (or MAIL_SMTP_* fallback) is configured; otherwise logs in development.
 */
export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  const settings = await getAppSettings();
  const smtpHost = process.env.SYSTEM_SMTP_HOST || process.env.MAIL_SMTP_HOST;
  const smtpPort = parseInt(process.env.SYSTEM_SMTP_PORT || process.env.MAIL_SMTP_PORT || "587", 10);
  const smtpUser = process.env.SYSTEM_SMTP_USER;
  const smtpPass = process.env.SYSTEM_SMTP_PASSWORD;
  const fromEmail =
    process.env.SYSTEM_FROM_EMAIL ||
    `no-reply@${settings.appUrl.replace(/https?:\/\//, "").split(":")[0] || "monogrammail.com"}`;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " "),
      });
      return true;
    } catch (err) {
      console.error("[Email Dispatcher] SMTP send failed:", err);
      if (process.env.NODE_ENV === "production") {
        return false;
      }
    }
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      `[Email Dispatcher] SYSTEM_SMTP_* not configured — cannot send to ${to}: ${subject}`
    );
    return false;
  }

  console.log(`
┌────────────────────────────────────────────────────────┐
│  TRANSACTIONAL SYSTEM EMAIL (dev log — SMTP not set)  │
├────────────────────────────────────────────────────────┤
│ To:      ${to.padEnd(45)} │
│ Subject: ${subject.slice(0, 45).padEnd(45)} │
│ Date:    ${new Date().toISOString().padEnd(45)} │
└────────────────────────────────────────────────────────┘
`);
  return true;
}

/**
 * Password reset notification template
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const settings = await getAppSettings();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Reset Your Password</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        We received a request to reset your password for your <strong>${settings.appName}</strong> account.
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        This link is valid for <strong>1 hour</strong>. If you did not request this password reset, please ignore this email or contact support.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
        ${settings.appName} • Cloud Email Infrastructure
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Password Reset Request - ${settings.appName}`,
    html,
  });
}

/**
 * Welcome & Onboarding email template
 */
export async function sendWelcomeEmail(email: string, name: string, orgName: string): Promise<boolean> {
  const settings = await getAppSettings();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Welcome to ${settings.appName}!</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        Hello ${name || "there"},
      </p>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        Your organization <strong>${orgName}</strong> is now configured on our carrier-grade business email platform.
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${settings.appUrl}/dashboard" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Go to Control Plane
        </a>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Next steps to activate your business mail:
      </p>
      <ol style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li>Connect your corporate domain in the <strong>Domains</strong> portal</li>
        <li>Configure your MX, SPF, and DKIM DNS records</li>
        <li>Create mailboxes for your team members</li>
      </ol>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
        ${settings.appName} • ${settings.supportEmail}
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to ${settings.appName} - Getting Started`,
    html,
  });
}

/**
 * Mailbox setup instruction letter for end-users
 */
export async function sendMailboxSetupEmail(
  to: string,
  mailboxAddress: string,
  initialPassword?: string
): Promise<boolean> {
  const settings = await getAppSettings();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Your Business Mailbox is Ready</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        Your new business email address <strong>${mailboxAddress}</strong> has been created.
      </p>
      ${
        initialPassword
          ? `<p style="color: #475569; font-size: 14px;">Temporary Password: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${initialPassword}</code></p>`
          : ""
      }
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <h3 style="font-size: 14px; margin: 0 0 10px 0; color: #1e293b;">Client Configuration Parameters</h3>
        <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
          <tr><td style="padding: 4px 0; font-weight: 600;">Webmail:</td><td><a href="${settings.mailWebmailUrl}" style="color: #4f46e5;">${settings.mailWebmailUrl}</a></td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">IMAP Server:</td><td>${settings.mailImapHost} (Port ${settings.mailImapPort} / SSL)</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">SMTP Server:</td><td>${settings.mailSmtpHost} (Port ${settings.mailSmtpPort} / TLS)</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Username:</td><td>${mailboxAddress}</td></tr>
        </table>
      </div>
      <p style="color: #64748b; font-size: 13px;">
        You can connect with Apple Mail, Outlook, Thunderbird, or sign in directly to Webmail.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Your Email Account Details: ${mailboxAddress}`,
    html,
  });
}
