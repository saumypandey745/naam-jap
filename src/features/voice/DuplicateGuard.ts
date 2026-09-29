/**
 * DuplicateGuard.ts
 *
 * Prevents one spoken mantra from being counted multiple times due to:
 * - Duplicate browser recognition events for the same utterance
 * - Overlapping/cumulative recognition results
 * - Recognition restart causing re-processing of the same audio
 * - Multiple recognition events within the debounce window
 *
 * Pure TypeScript — no React, no browser APIs.
 *
 * Identity is tracked by:
 *   1. resultIndex  — unique per recognition result slot
 *   2. Fingerprint  — normalized transcript + resultIndex combination
 *   3. Timestamp    — for time-window-based dedup
 */

import { normalizeText } from '@/utils/normalize';

interface AcceptedEntry {
  fingerprint: string;
  normalizedText: string;
  timestamp: number;
  resultIndex: number;
}

const BUFFER_MAX_SIZE = 50;

export class DuplicateGuard {
  private processedFingerprints = new Set<string>();
  private recentEntries: AcceptedEntry[] = [];
  private duplicateWindowMs: number;

  constructor(duplicateWindowMs: number = 1500) {
    this.duplicateWindowMs = duplicateWindowMs;
  }

  /**
   * Check if this recognition result should be accepted.
   *
   * Returns true if this is a NEW, non-duplicate result.
   * Returns false if this is a duplicate and should be rejected.
   *
   * @param resultIndex   - The browser's SpeechRecognitionResult index
   * @param transcript    - The final transcript for this result
   * @param timestamp     - When this result was received
   */
  isAccepted(
    resultIndex: number,
    transcript: string,
    timestamp: number,
  ): { accepted: boolean; reason: string } {
    const normalizedText = normalizeText(transcript);
    const fingerprint = `${resultIndex}::${normalizedText}`;

    // Guard 1: Exact fingerprint already processed
    // (same resultIndex + same text = definite duplicate)
    if (this.processedFingerprints.has(fingerprint)) {
      return {
        accepted: false,
        reason: `Exact fingerprint duplicate: ${fingerprint}`,
      };
    }

    // Guard 2: Same resultIndex seen before (browser re-sent same result)
    const sameIndexEntry = this.recentEntries.find(
      (e) => e.resultIndex === resultIndex,
    );
    if (sameIndexEntry) {
      return {
        accepted: false,
        reason: `Duplicate resultIndex=${resultIndex}, previously processed at ${sameIndexEntry.timestamp}`,
      };
    }

    // Guard 3: Same normalized text within duplicate window
    // This catches cases where the browser fires two final events for
    // the same spoken content within a very short time
    const now = timestamp;
    const windowStart = now - this.duplicateWindowMs;

    const recentDuplicate = this.recentEntries.find(
      (e) =>
        e.normalizedText === normalizedText &&
        e.timestamp >= windowStart,
    );

    if (recentDuplicate) {
      const timeDiff = now - recentDuplicate.timestamp;
      return {
        accepted: false,
        reason: `Same transcript within duplicate window (${timeDiff}ms < ${this.duplicateWindowMs}ms)`,
      };
    }

    // Accepted — record it
    this.processedFingerprints.add(fingerprint);
    this.recentEntries.push({
      fingerprint,
      normalizedText,
      timestamp,
      resultIndex,
    });

    // Keep buffer bounded
    if (this.recentEntries.length > BUFFER_MAX_SIZE) {
      const oldest = this.recentEntries.shift();
      if (oldest) {
        this.processedFingerprints.delete(oldest.fingerprint);
      }
    }

    return { accepted: true, reason: 'ok' };
  }

  /**
   * Reset all state. Called when a new Jap session starts,
   * or when recognition is restarted after a long pause.
   */
  reset(): void {
    this.processedFingerprints.clear();
    this.recentEntries = [];
  }

  /**
   * Evict entries older than the configured window from the timestamp index.
   * Should be called periodically during long sessions to prevent memory growth.
   */
  evictStale(currentTimestamp: number): void {
    const windowStart = currentTimestamp - this.duplicateWindowMs;
    const before = this.recentEntries.length;
    this.recentEntries = this.recentEntries.filter(
      (e) => e.timestamp >= windowStart,
    );
    // Note: we keep fingerprints set intact — older resultIndex fingerprints
    // should still be tracked to prevent late-arriving duplicate events
    const after = this.recentEntries.length;
    if (before !== after) {
      // Rebuild fingerprint set from remaining entries
      this.processedFingerprints.clear();
      for (const entry of this.recentEntries) {
        this.processedFingerprints.add(entry.fingerprint);
      }
    }
  }

  get stats() {
    return {
      processedCount: this.processedFingerprints.size,
      recentEntriesCount: this.recentEntries.length,
      duplicateWindowMs: this.duplicateWindowMs,
    };
  }
}
