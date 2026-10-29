import fs from "fs/promises";
import path from "path";
import { decryptSecret } from "@/lib/crypto/fieldEncryption";

export interface DkimSyncResult {
  synced: boolean;
  message: string;
}

/**
 * Writes DKIM private key material for Rspamd/Dovecot when IREDMAIL_DKIM_DIR is configured.
 * Requires reload of Rspamd on the mail node (ops) after sync.
 */
export async function syncDkimSigningKeyToMailNode(options: {
  domain: string;
  selector: string;
  privateKeyPem: string;
}): Promise<DkimSyncResult> {
  const dir = process.env.IREDMAIL_DKIM_DIR?.trim();
  if (!dir) {
    return {
      synced: false,
      message: "IREDMAIL_DKIM_DIR not configured — DNS DKIM verified but signing key not installed on mail node.",
    };
  }

  const domain = options.domain.toLowerCase();
  const selector = options.selector || "default";
  const fileBase = `${domain}.${selector}`;
  const privatePath = path.join(dir, `${fileBase}.private`);
  const metaPath = path.join(dir, `${fileBase}.txt`);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(privatePath, options.privateKeyPem.trim() + "\n", { mode: 0o600 });
  await fs.writeFile(
    metaPath,
    `domain=${domain}\nselector=${selector}\n`,
    { mode: 0o644 }
  );

  return {
    synced: true,
    message: `DKIM private key written to ${privatePath}. Reload Rspamd on the mail node.`,
  };
}

export async function syncDkimFromEncryptedDomainRecord(domain: {
  name: string;
  dkimSelector: string;
  dkimPrivateKeyEncrypted: string | null;
}): Promise<DkimSyncResult> {
  if (!domain.dkimPrivateKeyEncrypted) {
    return {
      synced: false,
      message: "No DKIM private key stored for this domain.",
    };
  }
  try {
    const privateKeyPem = decryptSecret(domain.dkimPrivateKeyEncrypted);
    return syncDkimSigningKeyToMailNode({
      domain: domain.name,
      selector: domain.dkimSelector,
      privateKeyPem,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "DKIM decrypt failed";
    return { synced: false, message };
  }
}
