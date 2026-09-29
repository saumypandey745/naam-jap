/**
 * RepetitionParser.ts
 *
 * Counts how many times a target mantra appears in a transcript segment.
 * Pure TypeScript — no React, no browser APIs.
 *
 * Critical distinction:
 *   "ram ram ram" → 3 (not 1)
 *   "hello how are you" → 0
 *   "hello ram" → 1
 *
 * This module is called AFTER the MantraMatchEngine confirms a match.
 * Its job is purely counting repetitions within an already-validated segment.
 */

import { MantraConfig } from '@/types/mantra';
import { normalizeText, tokenize } from '@/utils/normalize';
import { similarity } from '@/utils/levenshtein';

const DEFAULT_MAX_REPETITIONS = 20;

/**
 * Count how many times the target mantra (or any of its forms) appears
 * in the given transcript segment.
 *
 * @param transcript  - Already-finalized delta text
 * @param config      - MantraConfig with normalized forms and aliases
 * @param maxCount    - Safety cap per event (default 20)
 */
export function countRepetitions(
  transcript: string,
  config: MantraConfig,
  maxCount: number = DEFAULT_MAX_REPETITIONS,
): number {
  const normalizedTranscript = normalizeText(transcript);
  if (!normalizedTranscript) return 0;

  const transcriptTokens = tokenize(normalizedTranscript);
  if (transcriptTokens.length === 0) return 0;

  const minSimilarity = config.minimumSimilarity;

  // Build a list of all mantra forms to try, ordered by token count
  const allForms = [
    ...config.normalizedForms.map((f) => normalizeText(f)),
    ...config.aliases.map((a) => normalizeText(a)),
  ].filter(Boolean);

  if (allForms.length === 0) return 0;

  // Find the "canonical" form — use the shortest normalized form as primary
  // (most likely to be the base chantable unit)
  const canonicalForm = allForms.reduce(
    (a, b) => (a.length <= b.length ? a : b),
    allForms[0],
  );
  const canonicalTokens = tokenize(canonicalForm);

  if (canonicalTokens.length === 0) return 0;

  let count = 0;

  if (canonicalTokens.length === 1) {
    // ─────────────────────────────────────────────────────
    // Single-token mantra: count each matching transcript token
    // Example: "ram" → count every token that matches "ram"
    // "ram ram ram" → 3
    // ─────────────────────────────────────────────────────
    const target = canonicalTokens[0];
    for (const token of transcriptTokens) {
      const sim = similarity(token, target);
      if (sim >= minSimilarity) {
        count++;
        if (count >= maxCount) break;
      }
    }
  } else {
    // ─────────────────────────────────────────────────────
    // Multi-token mantra: count consecutive phrase occurrences
    // Example: "om namah shivaya om namah shivaya" → 2
    // ─────────────────────────────────────────────────────
    let i = 0;
    while (i <= transcriptTokens.length - canonicalTokens.length) {
      let phraseMatched = true;
      for (let j = 0; j < canonicalTokens.length; j++) {
        const sim = similarity(transcriptTokens[i + j], canonicalTokens[j]);
        if (sim < minSimilarity) {
          phraseMatched = false;
          break;
        }
      }
      if (phraseMatched) {
        count++;
        i += canonicalTokens.length;
        if (count >= maxCount) break;
      } else {
        i++;
      }
    }
  }

  return Math.min(count, maxCount);
}
