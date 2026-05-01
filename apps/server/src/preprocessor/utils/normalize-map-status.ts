/**
 * Converts a raw MapStatus string from the MOG CSV (e.g. "Mapped", "Pending")
 * to the canonical uppercase DB value.
 */
export function normalizeMapStatus(raw: string): string {
  const lower = (raw ?? '').trim().toLowerCase();
  if (lower === 'mapped') return 'MAPPED';
  return 'PENDING';
}
