import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { deriveTenantKey } from "./keys";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

/**
 * Encrypted token stored as JSON string in the database.
 * The `_enc` field acts as a sentinel to distinguish from plaintext.
 */
interface EncryptedToken {
  _enc: true;
  ct: string; // ciphertext (hex)
  iv: string; // initialization vector (hex)
  at: string; // auth tag (hex)
  kv: number; // key version
}

/**
 * Encrypts a token string using AES-256-GCM.
 * Uses the connection ID as key context (not tenant-specific since
 * calendar operations often run without tenant context).
 *
 * @param plaintext - The raw token value
 * @param contextId - Unique context for key derivation (e.g., connection UUID)
 * @param keyVersion - Key version (default 1)
 * @returns JSON string to store in the text column
 */
export function encryptToken(
  plaintext: string,
  contextId: string,
  keyVersion: number = 1
): string {
  const key = deriveTenantKey(contextId, keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  const payload: EncryptedToken = {
    _enc: true,
    ct: ciphertext,
    iv: iv.toString("hex"),
    at: authTag.toString("hex"),
    kv: keyVersion,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts a token string. If the value is plaintext (not encrypted),
 * returns it as-is for backward compatibility during migration.
 */
export function decryptToken(stored: string, contextId: string): string {
  // Backward compatibility: plaintext tokens don't start with '{'
  if (!stored.startsWith("{")) {
    return stored;
  }

  let payload: EncryptedToken;
  try {
    payload = JSON.parse(stored);
  } catch {
    // Not JSON — treat as plaintext
    return stored;
  }

  if (!payload._enc) {
    // Not an encrypted token — treat as plaintext
    return stored;
  }

  const key = deriveTenantKey(contextId, payload.kv);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(payload.at, "hex"));

  let plaintext = decipher.update(payload.ct, "hex", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}
