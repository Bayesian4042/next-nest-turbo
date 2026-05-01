/**
 * Matches units of measurement and the abbreviation "UB" (house brand marker)
 * that appear as noise in APL article descriptions.
 *
 * Patterns matched (case-insensitive, whole words):
 *   - Compound quantities: 2x500ml, 1X1Kg
 *   - Plain quantities:    5KG, 1LTR, 500g, 1 L, 3pcs
 *   - House brand marker:  UB
 */
const NOISE_RE = /\b(\d+x\d+\w*|\d+\s*(?:kg|g|l|ml|ltr|pcs|pc|gm)|ub)\b/gi;

export function cleanDescription(raw: string): string {
  return raw
    .replace(NOISE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}
