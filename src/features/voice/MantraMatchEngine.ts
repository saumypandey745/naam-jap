/**
 * MantraMatchEngine.ts
 *
 * Core mantra-matching logic. Pure TypeScript — no React, no browser APIs.
 * Every matching decision is deterministic and testable.
 *
 * Matching pipeline (multi-stage):
 *   Stage 1 — Exact match against normalizedForms
 *   Stage 2 — Alias match
 *   Stage 3 — Token-level exact match (for multi-word transcripts)
 *   Stage 4 — Fuzzy similarity (Levenshtein)
 *   Stage 5 — Context rejection (if no stage passed)
 *
 * NEVER accepts a result just because speech was detected.
 * The matched mantra tokens must be present in the transcript.
 */

import { MantraConfig } from '@/types/mantra';
import { MatchResult } from '@/types/voice';
import { normalizeText, tokenize } from '@/utils/normalize';
import { similarity } from '@/utils/levenshtein';

/**
 * Tokenize a mantra config's primary forms for per-token matching.
 * E.g., "shri ram" → ["shri", "ram"] — each token must be counted separately.
 */
function getMantraTokens(config: MantraConfig): string[] {
  const allForms = [...config.normalizedForms, ...config.aliases];
  // Return the shortest form's tokens (usually the base mantra)
  const shortest = allForms.reduce((a, b) => (a.length <= b.length ? a : b), allForms[0]);
  return tokenize(shortest);
}

/**
 * For a multi-word mantra (e.g., "om namah shivaya"), check if the
 * transcript contains the mantra as a consecutive token sequence.
 * Returns the number of times the complete mantra phrase appears.
 */
function countPhraseOccurrences(
  transcriptTokens: string[],
  phraseTokens: string[],
  minSimilarity: number,
): number {
  if (phraseTokens.length === 0 || transcriptTokens.length === 0) return 0;
  if (transcriptTokens.length < phraseTokens.length) return 0;

  let count = 0;
  let i = 0;

  while (i <= transcriptTokens.length - phraseTokens.length) {
    // Check if the phrase matches starting at position i
    let phraseMatched = true;
    for (let j = 0; j < phraseTokens.length; j++) {
      const sim = similarity(transcriptTokens[i + j], phraseTokens[j]);
      if (sim < minSimilarity) {
        phraseMatched = false;
        break;
      }
    }
    if (phraseMatched) {
      count++;
      i += phraseTokens.length; // skip past matched phrase
    } else {
      i++;
    }
  }

  return count;
}

/**
 * For a single-token mantra (e.g., "ram"), count how many tokens
 * in the transcript fuzzy-match the mantra with sufficient similarity.
 */
function countTokenOccurrences(
  transcriptTokens: string[],
  mantraToken: string,
  minSimilarity: number,
  debugSimilarities: Array<{ token: string; score: number }>,
): number {
  let count = 0;
  for (const token of transcriptTokens) {
    const sim = similarity(token, mantraToken);
    debugSimilarities.push({ token, score: sim });
    if (sim >= minSimilarity) {
      count++;
    }
  }
  return count;
}

/**
 * Check if the transcript is an exact match for any normalized form.
 */
function exactFormMatch(
  normalizedTranscript: string,
  normalizedForms: string[],
  aliases: string[],
): 'exact' | 'alias' | null {
  for (const form of normalizedForms) {
    if (normalizedTranscript === form) return 'exact';
  }
  for (const alias of aliases) {
    if (normalizedTranscript === normalizeText(alias)) return 'alias';
  }
  return null;
}

/**
 * Main entry point.
 *
 * @param transcript - The finalized, delta-extracted transcript segment
 * @param config     - MantraConfig for the selected mantra
 * @returns          - MatchResult with full debug info
 */
export function match(transcript: string, config: MantraConfig): MatchResult {
  const normalizedTranscript = normalizeText(transcript);
  const normalizedTarget =
    config.normalizedForms.length > 0
      ? normalizeText(config.normalizedForms[0])
      : normalizeText(config.originalScript);
  const normalizedAliases = config.aliases.map((a) => normalizeText(a));

  const debugInfo: MatchResult['debugInfo'] = {
    rawTranscript: transcript,
    normalizedTranscript,
    normalizedTarget,
    allSimilarities: [],
  };

  // Guard: empty transcript
  if (!normalizedTranscript || normalizedTranscript.trim().length === 0) {
    return {
      matched: false,
      repetitions: 0,
      matchedTokens: [],
      similarity: 0,
      reason: 'invalid',
      debugInfo,
    };
  }

  const transcriptTokens = tokenize(normalizedTranscript);
  const allNormalizedForms = [
    ...config.normalizedForms.map((f) => normalizeText(f)),
    ...normalizedAliases,
  ].filter(Boolean);

  const minSimilarity = config.minimumSimilarity;

  // ─────────────────────────────────────────────────────────
  // Stage 1: Full-transcript exact match
  // ─────────────────────────────────────────────────────────
  const exactKind = exactFormMatch(
    normalizedTranscript,
    config.normalizedForms.map((f) => normalizeText(f)),
    config.aliases,
  );
  if (exactKind !== null) {
    return {
      matched: true,
      repetitions: 1,
      matchedTokens: [normalizedTranscript],
      similarity: 1,
      reason: exactKind,
      debugInfo: { ...debugInfo, allSimilarities: [{ token: normalizedTranscript, score: 1 }] },
    };
  }

  // ─────────────────────────────────────────────────────────
  // Stage 2: Per-form token counting
  // ─────────────────────────────────────────────────────────
  // Try each normalized form. Use the one that produces the
  // highest count in the transcript.
  let bestCount = 0;
  let bestSimilarity = 0;
  const matchedTokens: string[] = [];

  for (const form of allNormalizedForms) {
    const formTokens = tokenize(form);

    if (formTokens.length === 0) continue;

    if (formTokens.length === 1) {
      // Single-token mantra: count every transcript token that matches
      const debugSims: Array<{ token: string; score: number }> = [];
      const count = countTokenOccurrences(
        transcriptTokens,
        formTokens[0],
        minSimilarity,
        debugSims,
      );
      debugInfo.allSimilarities.push(...debugSims);

      if (count > bestCount) {
        bestCount = count;
        bestSimilarity = debugSims.reduce((max, s) => Math.max(max, s.score), 0);
      }
    } else {
      // Multi-token mantra phrase: count consecutive phrase occurrences
      const count = countPhraseOccurrences(transcriptTokens, formTokens, minSimilarity);
      if (count > bestCount) {
        bestCount = count;
        // Compute average similarity for debug
        bestSimilarity = minSimilarity; // conservative
      }
    }
  }

  if (bestCount > 0) {
    return {
      matched: true,
      repetitions: bestCount,
      matchedTokens,
      similarity: bestSimilarity,
      reason: bestSimilarity >= 0.95 ? 'exact' : 'fuzzy',
      debugInfo,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Stage 3: Full transcript fuzzy match (entire transcript vs each form)
  // This catches cases like "shri ram" being spoken as "shree ram"
  // ─────────────────────────────────────────────────────────
  for (const form of allNormalizedForms) {
    const sim = similarity(normalizedTranscript, form);
    debugInfo.allSimilarities.push({ token: normalizedTranscript, score: sim });
    if (sim >= minSimilarity && sim > bestSimilarity) {
      bestSimilarity = sim;
      bestCount = 1;
    }
  }

  if (bestCount > 0) {
    return {
      matched: true,
      repetitions: 1,
      matchedTokens: [normalizedTranscript],
      similarity: bestSimilarity,
      reason: 'fuzzy',
      debugInfo,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Stage 4: No match — reject
  // ─────────────────────────────────────────────────────────
  return {
    matched: false,
    repetitions: 0,
    matchedTokens: [],
    similarity: bestSimilarity,
    reason: bestSimilarity > 0.3 ? 'low-confidence' : 'no-match',
    debugInfo,
  };
}
