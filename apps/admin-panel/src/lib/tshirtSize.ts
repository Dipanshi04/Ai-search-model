// Chest size (inches) per t-shirt size, for display only — the stored
// value stays the plain size letter (S/M/L/...); this is just how it's
// shown across the admin panel so staff can see the measurement at a
// glance without a separate lookup chart.
const CHEST_SIZE: Record<string, number> = {
  XS: 34,
  S: 36,
  M: 38,
  L: 40,
  XL: 42,
  XXL: 44,
  XXXL: 46,
};

export function formatTshirtSize(size: string | null | undefined): string {
  if (!size) return '—';
  const chest = CHEST_SIZE[size];
  return chest ? `${size}/${chest}` : size;
}
