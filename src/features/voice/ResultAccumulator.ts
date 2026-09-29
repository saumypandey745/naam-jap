/**
 * ResultAccumulator.ts
 *
 * Manages the state of SpeechRecognition results to prevent
 * double-counting due to cumulative/overlapping results.
 *
 * Problem:
 *   The Web Speech API fires `onresult` events multiple times,
 *   and the results array may grow cumulatively. For example:
 *
 *   Event 1: results[0] = { transcript: "Ram", isFinal: true }
 *   Event 2: results[0] = { transcript: "Ram", isFinal: true }
 *             results[1] = { transcript: "Ram", isFinal: true }
 *
 *   Without proper accumulation, we'd count "Ram" 3 times (1+2)
 *   when the user only said it twice.
 *
 * Solution:
 *   Track which resultIndex slots have been finalized and processed.
 *   Only emit new finalized content.
 *
 * Also handles:
 *   - Transcript delta extraction (new text vs already processed)
 *   - Recognition restart (clears accumulation state)
 */

import { normalizeText } from '@/utils/normalize';

interface FinalizedSlot {
  resultIndex: number;
  normalizedTranscript: string;
  rawTranscript: string;
  timestamp: number;
  emitted: boolean;
}

export interface AccumulatorResult {
  isNew: boolean;
  resultIndex: number;
  transcript: string;
  normalizedTranscript: string;
  reason: 'new-final' | 'already-processed' | 'interim-only';
}

export class ResultAccumulator {
  // Map from resultIndex → finalized slot
  private finalizedSlots = new Map<number, FinalizedSlot>();
  // The highest resultIndex we've seen finalized
  private highestFinalizedIndex = -1;

  /**
   * Process a SpeechRecognition result event.
   *
   * @param resultIndex  - The event.resultIndex from the browser
   * @param transcript   - The transcript for this result
   * @param isFinal      - Whether this result is finalized
   * @param timestamp    - When this was received
   * @returns AccumulatorResult indicating whether to process this result
   */
  process(
    resultIndex: number,
    transcript: string,
    isFinal: boolean,
    timestamp: number,
  ): AccumulatorResult {
    // Interim results are NEVER processed for counting
    if (!isFinal) {
      return {
        isNew: false,
        resultIndex,
        transcript,
        normalizedTranscript: normalizeText(transcript),
        reason: 'interim-only',
      };
    }

    const normalizedTranscript = normalizeText(transcript);

    // Check if we've already finalized this resultIndex slot
    const existing = this.finalizedSlots.get(resultIndex);
    if (existing && existing.emitted) {
      return {
        isNew: false,
        resultIndex,
        transcript,
        normalizedTranscript,
        reason: 'already-processed',
      };
    }

    // New finalization for this slot
    this.finalizedSlots.set(resultIndex, {
      resultIndex,
      normalizedTranscript,
      rawTranscript: transcript,
      timestamp,
      emitted: true,
    });

    if (resultIndex > this.highestFinalizedIndex) {
      this.highestFinalizedIndex = resultIndex;
    }

    return {
      isNew: true,
      resultIndex,
      transcript,
      normalizedTranscript,
      reason: 'new-final',
    };
  }

  /**
   * Reset state when recognition session restarts.
   * This prevents leftover state from previous session causing
   * false duplicate rejections in the new session.
   *
   * Important: Only call this when recognition is fully stopped
   * and restarting from scratch — NOT when it auto-restarts
   * mid-session (which continues from the same result stream).
   */
  reset(): void {
    this.finalizedSlots.clear();
    this.highestFinalizedIndex = -1;
  }

  /**
   * Prune slots older than a threshold to prevent memory growth.
   * Called periodically during long sessions.
   */
  pruneOlderThan(timestampThreshold: number): void {
    for (const [idx, slot] of this.finalizedSlots) {
      if (slot.timestamp < timestampThreshold) {
        this.finalizedSlots.delete(idx);
      }
    }
  }

  get diagnostics() {
    return {
      finalizedSlotCount: this.finalizedSlots.size,
      highestFinalizedIndex: this.highestFinalizedIndex,
    };
  }
}
