import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Hash a password using scrypt with a unique 16-byte random salt.
 * Result format: salt:hexDerivedKey
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash) return false;
  if (!storedHash.includes(":")) {
    return password === storedHash;
  }
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  try {
    const key = Buffer.from(keyHex, "hex");
    const derivedKey = scryptSync(password, salt, 64);
    if (key.length !== derivedKey.length) return false;
    return timingSafeEqual(key, derivedKey);
  } catch {
    return false;
  }
}
