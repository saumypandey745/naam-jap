/**
 * DuplicateGuard.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DuplicateGuard } from '@/features/voice/DuplicateGuard';

describe('DuplicateGuard', () => {
  let guard: DuplicateGuard;
  const WINDOW_MS = 1500;

  beforeEach(() => {
    guard = new DuplicateGuard(WINDOW_MS);
  });

  it('accepts the first occurrence of a result', () => {
    const result = guard.isAccepted(0, 'ram', Date.now());
    expect(result.accepted).toBe(true);
  });

  it('rejects the exact same resultIndex + transcript (exact fingerprint duplicate)', () => {
    const ts = Date.now();
    guard.isAccepted(0, 'ram', ts);
    const result = guard.isAccepted(0, 'ram', ts + 100);
    expect(result.accepted).toBe(false);
  });

  it('rejects same resultIndex even with different timestamp', () => {
    guard.isAccepted(5, 'ram', 1000);
    const result = guard.isAccepted(5, 'ram', 5000);
    expect(result.accepted).toBe(false);
  });

  it('rejects same text within duplicate window', () => {
    const ts = Date.now();
    guard.isAccepted(0, 'ram', ts);
    // Different resultIndex but same text within window
    const result = guard.isAccepted(1, 'ram', ts + 500);
    expect(result.accepted).toBe(false);
  });

  it('accepts same text AFTER duplicate window has passed', () => {
    const ts = 10000;
    guard.isAccepted(0, 'ram', ts);
    // Well after the window
    const result = guard.isAccepted(1, 'ram', ts + WINDOW_MS + 100);
    expect(result.accepted).toBe(true);
  });

  it('accepts different transcript within the window', () => {
    const ts = Date.now();
    guard.isAccepted(0, 'ram', ts);
    // Different mantra — should be accepted
    const result = guard.isAccepted(1, 'krishna', ts + 500);
    expect(result.accepted).toBe(true);
  });

  it('reset() clears all state and allows re-acceptance', () => {
    const ts = Date.now();
    guard.isAccepted(0, 'ram', ts);
    guard.reset();
    const result = guard.isAccepted(0, 'ram', ts + 100);
    expect(result.accepted).toBe(true);
  });

  it('evictStale() removes entries outside the window', () => {
    guard.isAccepted(0, 'ram', 1000);
    guard.isAccepted(1, 'krishna', 2000);
    // Evict up to timestamp 3000 (window = 1500ms, so entries before 1500 are stale)
    guard.evictStale(3000);
    // After eviction, resultIndex 0 at 1000 is now outside window
    // but fingerprint buffer rebuilt — re-accept should succeed now
    const result = guard.isAccepted(0, 'ram', 3500);
    expect(result.accepted).toBe(true);
  });

  it('provides stats', () => {
    const stats = guard.stats;
    expect(stats).toHaveProperty('processedCount');
    expect(stats).toHaveProperty('recentEntriesCount');
    expect(stats).toHaveProperty('duplicateWindowMs');
    expect(stats.duplicateWindowMs).toBe(WINDOW_MS);
  });
});
