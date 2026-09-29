/**
 * RepetitionParser.test.ts
 */

import { describe, it, expect } from 'vitest';
import { countRepetitions } from '@/features/voice/RepetitionParser';
import { MantraConfig } from '@/types/mantra';

const RAM: MantraConfig = {
  id: 'ram',
  displayName: 'राम',
  originalScript: 'राम',
  language: 'hi-IN',
  normalizedForms: ['ram', 'राम'],
  aliases: ['raam'],
  minimumSimilarity: 0.72,
  duplicateWindowMs: 1200,
};

const SHIVAYA: MantraConfig = {
  id: 'shivaya',
  displayName: 'ॐ नमः शिवाय',
  originalScript: 'ॐ नमः शिवाय',
  language: 'hi-IN',
  normalizedForms: ['om namah shivaya'],
  aliases: ['namah shivaya'],
  minimumSimilarity: 0.68,
  duplicateWindowMs: 2000,
};

describe('RepetitionParser', () => {
  // ── Single-token mantra ─────────────────────────────────

  it('"ram" → 1', () => {
    expect(countRepetitions('ram', RAM)).toBe(1);
  });

  it('"Ram" → 1 (case insensitive)', () => {
    expect(countRepetitions('Ram', RAM)).toBe(1);
  });

  it('"RAM" → 1 (uppercase)', () => {
    expect(countRepetitions('RAM', RAM)).toBe(1);
  });

  it('"ram ram" → 2', () => {
    expect(countRepetitions('ram ram', RAM)).toBe(2);
  });

  it('"ram ram ram" → 3', () => {
    expect(countRepetitions('ram ram ram', RAM)).toBe(3);
  });

  it('"Ram Ram Ram Ram" → 4', () => {
    expect(countRepetitions('Ram Ram Ram Ram', RAM)).toBe(4);
  });

  it('"hello ram" → 1 (mantra in mixed speech)', () => {
    expect(countRepetitions('hello ram', RAM)).toBe(1);
  });

  it('"hello how are you" → 0 (no mantra)', () => {
    expect(countRepetitions('hello how are you', RAM)).toBe(0);
  });

  it('"" (empty) → 0', () => {
    expect(countRepetitions('', RAM)).toBe(0);
  });

  it('respects max cap of 5', () => {
    const manyRam = 'ram ram ram ram ram ram ram ram ram ram'; // 10 times
    expect(countRepetitions(manyRam, RAM, 5)).toBe(5);
  });

  it('default max cap of 20 works', () => {
    const manyRam = Array(25).fill('ram').join(' '); // 25 times
    expect(countRepetitions(manyRam, RAM)).toBe(20);
  });

  // ── Multi-token mantra ─────────────────────────────────

  it('"om namah shivaya" → 1', () => {
    expect(countRepetitions('om namah shivaya', SHIVAYA)).toBe(1);
  });

  it('"om namah shivaya om namah shivaya" → 2', () => {
    expect(countRepetitions('om namah shivaya om namah shivaya', SHIVAYA)).toBe(2);
  });

  it('"hello world" → 0 for shivaya config', () => {
    expect(countRepetitions('hello world', SHIVAYA)).toBe(0);
  });
});
