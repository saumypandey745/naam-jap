/**
 * ResultAccumulator.test.ts
 *
 * Tests for the critical deduplication of finalized recognition results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResultAccumulator } from '@/features/voice/ResultAccumulator';

describe('ResultAccumulator', () => {
  let accumulator: ResultAccumulator;

  beforeEach(() => {
    accumulator = new ResultAccumulator();
  });

  it('accepts a new final result', () => {
    const result = accumulator.process(0, 'Ram', true, Date.now());
    expect(result.isNew).toBe(true);
    expect(result.reason).toBe('new-final');
  });

  it('rejects interim results (never counts interim)', () => {
    const result = accumulator.process(0, 'Ram', false, Date.now());
    expect(result.isNew).toBe(false);
    expect(result.reason).toBe('interim-only');
  });

  it('rejects duplicate resultIndex for same final slot', () => {
    accumulator.process(0, 'Ram', true, Date.now());
    const second = accumulator.process(0, 'Ram', true, Date.now() + 50);
    expect(second.isNew).toBe(false);
    expect(second.reason).toBe('already-processed');
  });

  it('accepts a different resultIndex as new final', () => {
    accumulator.process(0, 'Ram', true, Date.now());
    const second = accumulator.process(1, 'Ram', true, Date.now() + 100);
    expect(second.isNew).toBe(true);
    expect(second.reason).toBe('new-final');
  });

  it('scenario: interim + interim + final only counts once', () => {
    const ts = Date.now();
    const i1 = accumulator.process(0, 'Ram', false, ts);        // interim
    const i2 = accumulator.process(0, 'Ram Ram', false, ts + 100);  // interim
    const i3 = accumulator.process(0, 'Ram Ram Ram', false, ts + 200); // interim
    const final = accumulator.process(0, 'Ram Ram Ram', true, ts + 300); // final

    expect(i1.isNew).toBe(false);
    expect(i2.isNew).toBe(false);
    expect(i3.isNew).toBe(false);
    expect(final.isNew).toBe(true);

    // Same final again
    const dup = accumulator.process(0, 'Ram Ram Ram', true, ts + 500);
    expect(dup.isNew).toBe(false);
  });

  it('reset() allows re-processing after session restart', () => {
    accumulator.process(0, 'Ram', true, Date.now());
    accumulator.reset();
    const result = accumulator.process(0, 'Ram', true, Date.now() + 100);
    expect(result.isNew).toBe(true);
  });

  it('provides diagnostics', () => {
    const d = accumulator.diagnostics;
    expect(d).toHaveProperty('finalizedSlotCount');
    expect(d).toHaveProperty('highestFinalizedIndex');
  });
});
