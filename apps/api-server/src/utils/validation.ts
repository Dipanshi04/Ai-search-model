// Deliberately permissive (not full RFC 5322) — just enough to catch what
// actually shows up in real CSVs: a missing "@" (e.g. "name.company.com"),
// no domain, or stray whitespace. Rejecting those at upload time beats
// silently creating an account nobody can ever receive mail or a PIN at.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | undefined | null): boolean {
  return !!email && EMAIL_RE.test(email.trim());
}
