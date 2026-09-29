// ============================================================
// Mantra Types — Extended
// ============================================================

export type SupportedLanguage = 'hi-IN' | 'en-US' | 'sa-IN';

export interface MantraMeaning {
  shortMeaning: string;    // 1-line meaning
  fullMeaning?: string;    // Extended meaning (paragraph)
  mahatmya?: string;       // Spiritual significance
  source?: string;         // Scripture source (e.g. "Valmiki Ramayan")
}

export interface MantraConfig {
  id: string;
  displayName: string;
  originalScript: string;
  language: SupportedLanguage;
  normalizedForms: string[];
  aliases: string[];
  minimumSimilarity: number;
  duplicateWindowMs: number;
  description?: string;
  deity?: string;
  isCustom?: boolean;
  // New fields
  meaning?: MantraMeaning;
  deityImageUrl?: string;    // Path to deity image (relative to /public)
  recommendedFor?: string;   // e.g. "Peace, Prosperity"
  bestTime?: string;         // e.g. "Brahma Muhurta, Sandhya"
}

export interface CustomMantraInput {
  displayName: string;
  originalScript: string;
  language: SupportedLanguage;
  aliases?: string[];
}
