// ============================================================
// Voice Engine Types
// ============================================================

export type VoiceState =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'processing'
  | 'paused'
  | 'denied'
  | 'unsupported'
  | 'error';

export interface RecognitionResult {
  resultIndex: number;
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export interface FinalizedSegment {
  id: string; // fingerprint: normalized transcript + resultIndex
  transcript: string;
  normalizedTranscript: string;
  resultIndex: number;
  timestamp: number;
  processed: boolean;
}

export interface TranscriptDelta {
  newText: string;
  isNew: boolean; // false if this is a repeat/duplicate of previously processed text
  basis: string; // what was already processed
}

export interface MatchResult {
  matched: boolean;
  repetitions: number;
  matchedTokens: string[];
  similarity: number;
  reason: 'exact' | 'alias' | 'fuzzy' | 'no-match' | 'low-confidence' | 'invalid';
  debugInfo: {
    rawTranscript: string;
    normalizedTranscript: string;
    normalizedTarget: string;
    allSimilarities: Array<{ token: string; score: number }>;
  };
}

export interface JapDetectedEvent {
  id: string;
  mantraId: string;
  repetitions: number;
  transcript: string;
  timestamp: number;
  mode: 'voice';
  debugInfo?: MatchResult['debugInfo'];
}

export interface VoiceEngineDebugInfo {
  state: VoiceState;
  lastInterimTranscript: string;
  lastFinalTranscript: string;
  lastNormalizedTranscript: string;
  lastDelta: string;
  lastMatchResult: MatchResult | null;
  lastEventId: string;
  processedSegmentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  isSupported: boolean;
  recognitionRestartCount: number;
}

// Speech Recognition API types (vendor-prefixed)
export interface SpeechRecognitionEventResult {
  transcript: string;
  confidence: number;
  isFinal?: boolean;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

export interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionEventResult;
  [index: number]: SpeechRecognitionEventResult;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
