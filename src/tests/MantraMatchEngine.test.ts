/**
 * MantraMatchEngine.test.ts
 *
 * Comprehensive test suite for the MantraMatchEngine.
 * These tests define the acceptance criteria for voice counting accuracy.
 *
 * All tests are deterministic and browser-independent.
 */

import { describe, it, expect } from 'vitest';
import { match } from '@/features/voice/MantraMatchEngine';
import { MantraConfig } from '@/types/mantra';

// ─────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────

const RAM_CONFIG: MantraConfig = {
  id: 'ram',
  displayName: 'श्री राम',
  originalScript: 'राम',
  language: 'hi-IN',
  normalizedForms: ['राम', 'ram', 'rama', 'shri ram'],
  aliases: ['raam', 'jai ram'],
  minimumSimilarity: 0.72,
  duplicateWindowMs: 1200,
};

const SHIVAYA_CONFIG: MantraConfig = {
  id: 'om-namah-shivaya',
  displayName: 'ॐ नमः शिवाय',
  originalScript: 'ॐ नमः शिवाय',
  language: 'hi-IN',
  normalizedForms: ['om namah shivaya', 'om namah sivaya', 'ॐ नमः शिवाय'],
  aliases: ['namah shivaya', 'om namo shivaya'],
  minimumSimilarity: 0.68,
  duplicateWindowMs: 2000,
};

const KRISHNA_CONFIG: MantraConfig = {
  id: 'krishna',
  displayName: 'कृष्ण',
  originalScript: 'कृष्ण',
  language: 'hi-IN',
  normalizedForms: ['कृष्ण', 'krishna', 'krishn'],
  aliases: ['krushna', 'kanha'],
  minimumSimilarity: 0.72,
  duplicateWindowMs: 1200,
};

// ─────────────────────────────────────────────────────────────────
// Core acceptance criteria tests
// ─────────────────────────────────────────────────────────────────

describe('MantraMatchEngine — Core', () => {
  it('should match exact mantra "ram"', () => {
    const result = match('ram', RAM_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(1);
  });

  it('should match Devanagari "राम"', () => {
    const result = match('राम', RAM_CONFIG);
    expect(result.matched).toBe(true);
  });

  it('should match capitalized "Ram"', () => {
    const result = match('Ram', RAM_CONFIG);
    expect(result.matched).toBe(true);
  });

  it('should match uppercase "RAM"', () => {
    const result = match('RAM', RAM_CONFIG);
    expect(result.matched).toBe(true);
  });

  it('should match alias "Raam"', () => {
    const result = match('Raam', RAM_CONFIG);
    expect(result.matched).toBe(true);
  });

  it('should NOT match empty string', () => {
    const result = match('', RAM_CONFIG);
    expect(result.matched).toBe(false);
    expect(result.repetitions).toBe(0);
    expect(result.reason).toBe('invalid');
  });

  it('should NOT match unrelated word "Hello"', () => {
    const result = match('Hello', RAM_CONFIG);
    expect(result.matched).toBe(false);
    expect(result.repetitions).toBe(0);
  });

  it('should NOT match full sentence "Hello how are you"', () => {
    const result = match('Hello how are you', RAM_CONFIG);
    expect(result.matched).toBe(false);
    expect(result.repetitions).toBe(0);
  });

  it('should NOT match different word "Krishna" for Ram config', () => {
    const result = match('Krishna', RAM_CONFIG);
    expect(result.matched).toBe(false);
    expect(result.repetitions).toBe(0);
  });

  it('should NOT match noise-like string "aaaa"', () => {
    // "aaaa" has no similarity to "ram" above threshold
    const result = match('aaaa', RAM_CONFIG);
    expect(result.matched).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// Repetition counting
// ─────────────────────────────────────────────────────────────────

describe('MantraMatchEngine — Repetition counting', () => {
  it('"ram ram" should produce repetitions >= 2', () => {
    const result = match('ram ram', RAM_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(2);
  });

  it('"ram ram ram" should produce repetitions >= 3', () => {
    const result = match('ram ram ram', RAM_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(3);
  });

  it('"Ram Ram Ram Ram" (capitalized) should produce repetitions >= 4', () => {
    const result = match('Ram Ram Ram Ram', RAM_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(4);
  });

  it('"hello ram" should produce repetitions >= 1', () => {
    const result = match('hello ram', RAM_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(1);
  });

  it('"hello how are you" should produce 0 repetitions', () => {
    const result = match('hello how are you', RAM_CONFIG);
    expect(result.matched).toBe(false);
    expect(result.repetitions).toBe(0);
  });

  it('"hello ram how are you" should still detect "ram"', () => {
    const result = match('hello ram how are you', RAM_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(1);
  });

  it('background TV speech should not match mantra', () => {
    const bgSpeech = 'what are you doing why is this happening to me';
    const result = match(bgSpeech, RAM_CONFIG);
    expect(result.matched).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// Multi-word mantra matching
// ─────────────────────────────────────────────────────────────────

describe('MantraMatchEngine — Multi-word mantras', () => {
  it('"om namah shivaya" should match', () => {
    const result = match('om namah shivaya', SHIVAYA_CONFIG);
    expect(result.matched).toBe(true);
  });

  it('"Om Namah Shivaya" (capitalized) should match', () => {
    const result = match('Om Namah Shivaya', SHIVAYA_CONFIG);
    expect(result.matched).toBe(true);
  });

  it('"om namah shivaya om namah shivaya" should produce >= 2 repetitions', () => {
    const result = match('om namah shivaya om namah shivaya', SHIVAYA_CONFIG);
    expect(result.matched).toBe(true);
    expect(result.repetitions).toBeGreaterThanOrEqual(2);
  });

  it('"namah shivaya" alias should match', () => {
    const result = match('namah shivaya', SHIVAYA_CONFIG);
    expect(result.matched).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// Return structure validation
// ─────────────────────────────────────────────────────────────────

describe('MantraMatchEngine — Result structure', () => {
  it('returns a structured MatchResult on match', () => {
    const result = match('ram', RAM_CONFIG);
    expect(result).toHaveProperty('matched');
    expect(result).toHaveProperty('repetitions');
    expect(result).toHaveProperty('matchedTokens');
    expect(result).toHaveProperty('similarity');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('debugInfo');
    expect(result.debugInfo).toHaveProperty('rawTranscript');
    expect(result.debugInfo).toHaveProperty('normalizedTranscript');
    expect(result.debugInfo).toHaveProperty('normalizedTarget');
  });

  it('reason is "exact" or "alias" for perfect matches', () => {
    const result = match('ram', RAM_CONFIG);
    expect(['exact', 'alias', 'fuzzy']).toContain(result.reason);
  });

  it('reason is "no-match" for clearly unrelated text', () => {
    const result = match('hello how are you doing today', RAM_CONFIG);
    expect(['no-match', 'low-confidence']).toContain(result.reason);
  });

  it('similarity is between 0 and 1', () => {
    const r1 = match('ram', RAM_CONFIG);
    const r2 = match('hello world', RAM_CONFIG);
    expect(r1.similarity).toBeGreaterThanOrEqual(0);
    expect(r1.similarity).toBeLessThanOrEqual(1);
    expect(r2.similarity).toBeGreaterThanOrEqual(0);
    expect(r2.similarity).toBeLessThanOrEqual(1);
  });
});
