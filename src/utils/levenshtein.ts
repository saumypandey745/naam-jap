/**
 * levenshtein.ts
 *
 * Pure implementation of Levenshtein edit distance.
 * No external dependencies. Fully testable in Node/jsdom.
 *
 * Returns the minimum number of single-character edits
 * (insertions, deletions, substitutions) required to
 * change string `a` into string `b`.
 */

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two rows instead of full matrix to save memory
  const lenB = b.length;
  let prev = new Array<number>(lenB + 1);
  let curr = new Array<number>(lenB + 1);

  for (let j = 0; j <= lenB; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,       // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost,    // substitution
      );
    }
    // Swap rows
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[lenB];
}

/**
 * Computes similarity score in [0, 1].
 * 1.0 = identical, 0.0 = completely different.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}
