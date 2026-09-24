// Deliberately permissive (not full RFC 5322) — just enough to catch what
// actually shows up in real CSVs: a missing "@" (e.g. "name.company.com"),
// no domain, or stray whitespace. Rejecting those at upload time beats
// silently creating an account nobody can ever receive mail or a PIN at.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string | undefined | null): boolean {
  return !!email && EMAIL_RE.test(email.trim());
}

// Registration, HR CSV uploads, and admin edits have all written this field
// as free text over time, so the same size ended up stored as "XL", "Xl",
// "xl", "2XL"/"XXL", "XS" (never offered as an actual option), etc. —
// splitting one real size into several reported buckets. Uppercasing/
// trimming collapses casing variants, and the alias map folds the two
// non-standard sizes people used into the canonical set actually offered
// in the UI (S/M/L/XL/XXL/XXXL).
const TSHIRT_SIZE_ALIASES: Record<string, string> = { XS: 'S', '2XL': 'XXL' };

export function normalizeTshirtSize(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (!upper) return null;
  return TSHIRT_SIZE_ALIASES[upper] || upper;
}
