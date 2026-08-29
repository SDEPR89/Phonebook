import crypto from "crypto";

const ITERATIONS = 210_000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

/**
 * Hash a password with a random salt using PBKDF2-SHA512.
 * Returns { hash, salt } — store both in the DB.
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return { hash, salt };
}

/**
 * Verify a password against a stored hash+salt.
 * Tries 210k iterations first (current), then 1k (legacy migration).
 * Returns { match, needsRehash } — if needsRehash is true, re-hash and update the DB.
 */
export function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): { match: boolean; needsRehash: boolean } {
  // Try current iteration count
  const currentHash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  try {
    const match = crypto.timingSafeEqual(
      Buffer.from(currentHash),
      Buffer.from(storedHash)
    );
    if (match) return { match: true, needsRehash: false };
  } catch {
    // Length mismatch — fall through to legacy check
  }

  // Try legacy 1k iteration count (for accounts not yet migrated)
  const legacyHash = crypto
    .pbkdf2Sync(password, salt, 1_000, KEY_LENGTH, DIGEST)
    .toString("hex");

  try {
    const match = crypto.timingSafeEqual(
      Buffer.from(legacyHash),
      Buffer.from(storedHash)
    );
    if (match) return { match: true, needsRehash: true }; // signal re-hash needed
  } catch {
    // ignore
  }

  return { match: false, needsRehash: false };
}
