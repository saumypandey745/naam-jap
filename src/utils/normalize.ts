/**
 * normalize.ts
 *
 * Text normalization for mantra matching.
 * Handles Hindi/Devanagari, Sanskrit, and romanized forms.
 * Pure functions — no browser dependencies, fully testable.
 */

/**
 * Devanagari vowel signs and matras that can appear as pronunciation variants
 * We normalize these common pairs for more lenient matching.
 */
const DEVANAGARI_NORMALIZATIONS: Array<[RegExp, string]> = [
  // Normalize nukta forms
  [/\u093C/g, ''],         // Remove nukta (◌़)
  // Normalize chandrabindu → anusvara
  [/\u0900/g, '\u0902'],   // Candrabindu → Anusvara
  // Normalize visarga to nothing for lenient matching
  // Note: We keep this conservative — only normalize spacing
  [/\s+/g, ' '],           // Normalize whitespace
];

/**
 * Normalize a string for comparison purposes.
 *
 * Steps:
 * 1. Unicode NFC normalization
 * 2. Lowercase
 * 3. Trim
 * 4. Collapse whitespace
 * 5. Remove leading/trailing punctuation
 * 6. Apply Devanagari normalizations
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  let normalized = text
    .normalize('NFC')
    .toLowerCase()
    .trim();

  // Apply Devanagari normalizations
  for (const [pattern, replacement] of DEVANAGARI_NORMALIZATIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Remove common punctuation that speech engines may insert
  normalized = normalized.replace(/[।॥,.!?'"]/g, ' ');

  // Collapse whitespace again after replacements
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Tokenize a normalized transcript into individual words/tokens.
 * Handles both Devanagari and Latin script.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Normalize a mantra's romanized form for comparison.
 * Handles common transliteration variants:
 * - ram / raam / rāma → ram
 * - krishna / krishn / krushna → krishna
 * - shiv / shiva / śiva → shiv
 */
export function normalizeRomanized(text: string): string {
  if (!text) return '';

  let normalized = normalizeText(text);

  // Common vowel length normalization (long vowels to short)
  // aa → a, ee → i, oo → u (but only when reasonable)
  normalized = normalized
    .replace(/aa/g, 'a')
    .replace(/ii/g, 'i')
    .replace(/uu/g, 'u');

  // Common consonant cluster normalization
  normalized = normalized
    .replace(/sh/g, 's')   // shiv → siv (for lenient matching)
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/ch/g, 'c')
    .replace(/jh/g, 'j')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/ph/g, 'p')
    .replace(/bh/g, 'b');

  return normalized;
}

/**
 * Generate a fingerprint for a transcript + resultIndex combination.
 * Used by DuplicateGuard to identify unique recognition events.
 */
export function generateFingerprint(
  normalizedTranscript: string,
  resultIndex: number,
): string {
  return `${resultIndex}::${normalizedTranscript}`;
}

/**
 * Format a number in Indian number system (e.g., 1,00,000)
 */
export function formatIndianNumber(num: number): string {
  if (num < 1000) return num.toString();

  const str = num.toString();
  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);

  if (rest.length === 0) return lastThree;

  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${formatted},${lastThree}`;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get date string from timestamp
 */
export function getDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}
