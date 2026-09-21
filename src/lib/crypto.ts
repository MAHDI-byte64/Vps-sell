import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

/**
 * Server credentials (root passwords) are stored sealed, not in clear text, so
 * a leaked database dump is not the same thing as a leaked fleet.
 *
 * Format: base64(iv[12] || authTag[16] || ciphertext). AES-256-GCM gives us
 * confidentiality plus tamper detection in one pass.
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function key(): Buffer {
  // The secret is arbitrary-length text; hash it down to the exact 32 bytes
  // AES-256 needs.
  return createHash("sha256").update(env.credentialSecret).digest();
}

export function sealSecret(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function openSecret(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  try {
    const raw = Buffer.from(sealed, "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const body = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key (usually a rotated CREDENTIAL_SECRET) or tampered payload.
    return null;
  }
}

/** Generates a strong root password for a freshly provisioned machine. */
export function generatePassword(length = 18): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%^*_-";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
