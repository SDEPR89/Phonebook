/**
 * Validate an email address format.
 * Returns true if the email has a valid structure.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validate UUID v4 / standard UUID format.
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id.trim()
  );
}

/**
 * Sanitize a string by trimming whitespace.
 */
export function sanitizeString(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Safely parse a JSON string as an array with fallback.
 */
export function parseJsonArray<T = unknown>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}


