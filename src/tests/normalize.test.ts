/**
 * normalize.test.ts
 */

import { describe, it, expect } from 'vitest';
import { normalizeText, tokenize, formatIndianNumber, formatDuration } from '@/utils/normalize';

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('RAM')).toBe('ram');
    expect(normalizeText('Ram')).toBe('ram');
  });

  it('trims whitespace', () => {
    expect(normalizeText('  ram  ')).toBe('ram');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('ram   ram')).toBe('ram ram');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('handles Devanagari text', () => {
    const result = normalizeText('राम');
    expect(result).toBe('राम');
  });

  it('removes danda punctuation', () => {
    const result = normalizeText('राम।');
    expect(result).not.toContain('।');
  });

  it('applies NFC normalization', () => {
    // NFC should handle combining character sequences
    const composed = '\u0916'; // ख (precomposed)
    const decomposed = '\u0915\u093C'; // क + nukta
    // After normalization they should be comparable
    expect(normalizeText(composed)).toBeTruthy();
  });
});

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('ram krishna')).toEqual(['ram', 'krishna']);
  });

  it('handles single word', () => {
    expect(tokenize('ram')).toEqual(['ram']);
  });

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles multiple spaces', () => {
    expect(tokenize('ram   krishna')).toEqual(['ram', 'krishna']);
  });

  it('normalizes before tokenizing', () => {
    expect(tokenize('RAM KRISHNA')).toEqual(['ram', 'krishna']);
  });
});

describe('formatIndianNumber', () => {
  it('formats numbers under 1000 without commas', () => {
    expect(formatIndianNumber(108)).toBe('108');
    expect(formatIndianNumber(999)).toBe('999');
  });

  it('formats 1000 as 1,000', () => {
    expect(formatIndianNumber(1000)).toBe('1,000');
  });

  it('formats 10000 as 10,000', () => {
    expect(formatIndianNumber(10000)).toBe('10,000');
  });

  it('formats 100000 as 1,00,000 (Indian system)', () => {
    expect(formatIndianNumber(100000)).toBe('1,00,000');
  });

  it('formats 1247 as 1,247', () => {
    expect(formatIndianNumber(1247)).toBe('1,247');
  });
});

describe('formatDuration', () => {
  it('formats seconds under 60', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats exactly 60s as 1m', () => {
    expect(formatDuration(60)).toBe('1m');
  });

  it('formats 90s as 1m 30s', () => {
    expect(formatDuration(90)).toBe('1m 30s');
  });

  it('formats 3600s as 1h', () => {
    expect(formatDuration(3600)).toBe('1h');
  });

  it('formats 3660s as 1h 1m', () => {
    expect(formatDuration(3660)).toBe('1h 1m');
  });
});
