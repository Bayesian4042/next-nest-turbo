/**
 * Normalizes a raw MOG name using a vocab map loaded from the MogVocab DB
 * table (keyed by lowercased rawName -> normalizedName).
 *
 * Strategy: replace whole-word occurrences of each known raw token with its
 * normalized form, then collapse whitespace. Falls back to trimmed original
 * if no vocab entries match.
 */
export function normalizeMogName(
  raw: string,
  vocabMap: Map<string, string>,
): string {
  let result = raw.trim();

  for (const [rawToken, normalized] of vocabMap) {
    const pattern = new RegExp(`\\b${escapeRegex(rawToken)}\\b`, 'gi');
    result = result.replace(pattern, normalized);
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
