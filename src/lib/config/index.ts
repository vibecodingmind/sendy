export interface AppSettings {
  appName: string;
  appUrl: string;
  supportEmail: string;
  mailWebmailUrl: string;
  mailImapHost: string;
  mailImapPort: number;
  mailSmtpHost: string;
  mailSmtpPort: number;
  mailMxHost: string;
  mailMxPriority: number;
  mailDkimSelector: string;
  mailNs1: string;
  mailNs2: string;
  termsUrl: string;
  privacyUrl: string;
}

export const defaultSettings: AppSettings = {
  appName: process.env.APP_NAME || "Monogram Mail",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  supportEmail: process.env.SUPPORT_EMAIL || "support@monogrammail.com",
  mailWebmailUrl: process.env.MAIL_WEBMAIL_URL || "https://mail.monogrammail.com",
  mailImapHost: process.env.MAIL_IMAP_HOST || "imap.monogrammail.com",
  mailImapPort: parseInt(process.env.MAIL_IMAP_PORT || "993", 10),
  mailSmtpHost: process.env.MAIL_SMTP_HOST || "smtp.monogrammail.com",
  mailSmtpPort: parseInt(process.env.MAIL_SMTP_PORT || "465", 10),
  mailMxHost: process.env.MAIL_MX_HOST || "mx1.monogrammail.com",
  mailMxPriority: parseInt(process.env.MAIL_MX_PRIORITY || "10", 10),
  mailDkimSelector: process.env.MAIL_DKIM_SELECTOR || "default",
  mailNs1: process.env.MAIL_NS1 || "ns1.monogrammail.com",
  mailNs2: process.env.MAIL_NS2 || "ns2.monogrammail.com",
  termsUrl: process.env.TERMS_URL || "/terms",
  privacyUrl: process.env.PRIVACY_URL || "/privacy",
};

export async function getAppSettings(): Promise<AppSettings> {
  // In dynamic runtime, we can check SystemSetting table with fallback to defaultSettings
  try {
    const { prisma } = await import("@/lib/db/prisma");
    const settings = await prisma.systemSetting.findMany();
    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      appName: map.get("APP_NAME") || defaultSettings.appName,
      appUrl: map.get("APP_URL") || defaultSettings.appUrl,
      supportEmail: map.get("SUPPORT_EMAIL") || defaultSettings.supportEmail,
      mailWebmailUrl: map.get("MAIL_WEBMAIL_URL") || defaultSettings.mailWebmailUrl,
      mailImapHost: map.get("MAIL_IMAP_HOST") || defaultSettings.mailImapHost,
      mailImapPort: parseInt(map.get("MAIL_IMAP_PORT") || String(defaultSettings.mailImapPort), 10),
      mailSmtpHost: map.get("MAIL_SMTP_HOST") || defaultSettings.mailSmtpHost,
      mailSmtpPort: parseInt(map.get("MAIL_SMTP_PORT") || String(defaultSettings.mailSmtpPort), 10),
      mailMxHost: map.get("MAIL_MX_HOST") || defaultSettings.mailMxHost,
      mailMxPriority: parseInt(map.get("MAIL_MX_PRIORITY") || String(defaultSettings.mailMxPriority), 10),
      mailDkimSelector: map.get("MAIL_DKIM_SELECTOR") || defaultSettings.mailDkimSelector,
      mailNs1: map.get("DNS_NAMESERVER_1") || process.env.MAIL_NS1 || defaultSettings.mailNs1,
      mailNs2: map.get("DNS_NAMESERVER_2") || process.env.MAIL_NS2 || defaultSettings.mailNs2,
      termsUrl: map.get("TERMS_URL") || defaultSettings.termsUrl,
      privacyUrl: map.get("PRIVACY_URL") || defaultSettings.privacyUrl,
    };
  } catch {
    return defaultSettings;
  }
}
