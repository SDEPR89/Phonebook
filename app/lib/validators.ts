/**
 * Validate an email address format.
 * Returns true if the email has a valid structure.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sanitize a string by trimming whitespace.
 */
export function sanitizeString(value: string | null | undefined): string {
  return (value ?? "").trim();
}
